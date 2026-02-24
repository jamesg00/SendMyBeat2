from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import random
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Literal
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.hash import bcrypt
from openai import AsyncOpenAI
from authlib.integrations.starlette_client import OAuth, OAuthError
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import json
import base64
import shutil
import stripe
import requests
import re
import subprocess
import html
from urllib.parse import urlencode
from itsdangerous import URLSafeSerializer, BadSignature
from models_spotlight import (
    ProducerProfile,
    ProducerProfileUpdate,
    SpotlightResponse,
    VerificationApplicationRequest,
    VerificationReviewRequest,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure Stripe (must be after load_dotenv)
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

# MongoDB connection
# Prefer self-hosted compatibility by accepting common env var names.
mongo_url = (
    os.environ.get("MONGO_URL")
    or os.environ.get("MONGODB_URI")
    or os.environ.get("DATABASE_URL")
)
if not mongo_url:
    raise RuntimeError("Missing MongoDB URL. Set MONGO_URL (or MONGODB_URI / DATABASE_URL).")

db_name = os.environ.get("DB_NAME", "sendmybeat")
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
db = client[db_name]

# JWT Configuration
JWT_SECRET = os.environ['JWT_SECRET_KEY']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
JWT_EXPIRATION = int(os.environ['JWT_EXPIRATION_MINUTES'])

# Reminder configuration
REMINDER_SECRET = os.environ.get('REMINDER_SECRET', JWT_SECRET)
BACKEND_URL = os.environ.get('BACKEND_URL', 'https://api.sendmybeat.com')
CREATOR_USER_ID = os.environ.get("CREATOR_USER_ID", "").strip()
CREATOR_USERNAME = os.environ.get("CREATOR_USERNAME", "deadat18").strip().lower()
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL')
TEXTBELT_API_KEY = os.environ.get('TEXTBELT_API_KEY')
REMINDER_SERIALIZER = URLSafeSerializer(REMINDER_SECRET)

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', 'your_google_client_id_here')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', 'your_google_client_secret_here')

# Security
security = HTTPBearer()


def build_cors_origins() -> list[str]:
    raw = (os.environ.get("CORS_ORIGINS") or "").strip()
    defaults = [
        "https://www.sendmybeat.com",
        "https://sendmybeat.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    if not raw or raw == "*":
        return defaults
    parsed = [origin.strip() for origin in raw.split(",") if origin.strip()]
    for origin in defaults:
        if origin not in parsed:
            parsed.append(origin)
    return parsed


CORS_ORIGINS = build_cors_origins()

# Create the main app without a prefix
app = FastAPI()

# Add session middleware for OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get('SESSION_SECRET_KEY', 'your-session-secret-key')
)

# OAuth setup
oauth = OAuth()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Create uploads directory
# Use env override when provided; default to backend-local path for dev compatibility.
UPLOADS_DIR = Path(os.environ.get("UPLOADS_DIR", str(ROOT_DIR / "uploads")))
UPLOADS_DIR.mkdir(exist_ok=True)

# ============ Cost Tracking Constants ============
HOSTING_COST = float(os.environ.get("HOSTING_COST_USD", 3.50))
# Grok-2 pricing (approximate): $2.00/M input, $10.00/M output
GROK_INPUT_COST = 2.0 / 1_000_000
GROK_OUTPUT_COST = 10.0 / 1_000_000

# ============ LLM Helper ============
_llm_client = None
_llm_config = None


async def track_llm_usage(user_id: str | None, usage_type: str, prompt_tokens: int, completion_tokens: int):
    cost = (prompt_tokens * GROK_INPUT_COST) + (completion_tokens * GROK_OUTPUT_COST)

    log = {
        "user_id": user_id or "system",
        "usage_type": usage_type,
        "tokens_in": prompt_tokens,
        "tokens_out": completion_tokens,
        "cost": cost,
        "timestamp": datetime.now(timezone.utc)
    }

    try:
        await db.usage_logs.insert_one(log)
    except Exception as e:
        logging.error(f"Failed to log usage: {str(e)}")


def _get_llm_settings(provider_override: str | None = None, model_override: str | None = None) -> dict:
    # Default to Grok to save costs
    provider = (provider_override or os.environ.get("LLM_PROVIDER", "grok")).lower()

    api_key = None
    base_url = None
    model = None

    if provider == "grok":
        api_key = os.environ.get("GROK_API_KEY") or os.environ.get("XAI_API_KEY")
        base_url = os.environ.get("GROK_BASE_URL", "https://api.x.ai/v1")
        model = model_override or os.environ.get("GROK_MODEL") or os.environ.get("LLM_MODEL", "grok-2-latest")
    elif provider == "openai":
        api_key = os.environ.get("OPENAI_API_KEY")
        base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model = model_override or os.environ.get("OPENAI_MODEL") or os.environ.get("LLM_MODEL", "gpt-4o")

    # Fallback to Grok defaults if provider is unknown or keys missing (attempt to use Grok env vars)
    if not api_key and provider != "grok":
         # If OpenAI requested but no key, try Grok
         provider = "grok"
         api_key = os.environ.get("GROK_API_KEY")
         base_url = "https://api.x.ai/v1"
         model = "grok-2-latest"

    if not api_key:
        # Don't crash immediately, let the client fail naturally or return a mock in development?
        # Better to raise error so they know to configure it
        if provider == "grok":
            raise RuntimeError("Missing GROK_API_KEY. Please set it in backend/.env")
        else:
            raise RuntimeError(f"Missing API key for LLM_PROVIDER={provider}")

    return {"provider": provider, "api_key": api_key, "base_url": base_url, "model": model}


def _get_llm_client(provider_override: str | None = None, model_override: str | None = None):
    global _llm_client, _llm_config
    settings = _get_llm_settings(provider_override=provider_override, model_override=model_override)
    config_key = (settings["provider"], settings["base_url"], settings["model"])
    if _llm_client is None or _llm_config != config_key:
        _llm_client = AsyncOpenAI(api_key=settings["api_key"], base_url=settings["base_url"])
        _llm_config = config_key
    return _llm_client, settings


def _get_vision_model_for_provider(provider_name: str) -> str:
    provider = (provider_name or os.environ.get("LLM_PROVIDER", "grok")).lower()
    if provider == "grok":
        return (
            os.environ.get("GROK_VISION_MODEL")
            or os.environ.get("GROK_MODEL_VISION")
            or "grok-2-vision-latest"
        )
    if provider == "openai":
        return (
            os.environ.get("OPENAI_VISION_MODEL")
            or os.environ.get("OPENAI_MODEL_VISION")
            or os.environ.get("OPENAI_MODEL")
            or "gpt-4o"
        )
    return os.environ.get("LLM_VISION_MODEL") or os.environ.get("LLM_MODEL", "gpt-4o")


def _parse_llm_json_response(raw_text: str) -> dict:
    text = (raw_text or "").strip()
    if not text:
        raise ValueError("Empty model response")

    # 1) Best case: already valid JSON
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # 2) JSON in markdown fence
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if fenced:
        candidate = fenced.group(1).strip()
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    # 3) First JSON object in free-form text
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace:last_brace + 1]
        # Mild cleanup for common LLM issue: trailing commas in objects/arrays
        candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            return parsed

    raise ValueError("No JSON object found in model response")


def _clean_artist_candidate(text: str) -> str:
    candidate = re.sub(r"\s+", " ", (text or "").strip())
    candidate = re.sub(r"[^a-zA-Z0-9&' .-]", "", candidate).strip(" -")
    if len(candidate) < 2:
        return ""
    return candidate


def _extract_artist_queries(title: str, tags: list[str]) -> list[str]:
    candidates: list[str] = []
    pool = [title or ""] + (tags or [])

    for raw in pool:
        s = (raw or "").lower().strip()
        if not s:
            continue

        # e.g. "lil uzi vert type beat", "drake x future type beat", "ken carson - type beat"
        if "type beat" in s:
            left = s.split("type beat")[0]
            left = re.sub(r"\b(inspired|style|vibe|free|hard|dark|melodic|rage|trap|drill|phonk)\b", "", left)
            parts = re.split(r"\s+x\s+|,|/|&| feat\.?| ft\.? ", left)
            for part in parts:
                c = _clean_artist_candidate(part.title())
                if c:
                    candidates.append(c)

    # Fallback to first words of title if no type-beat pattern
    if not candidates:
        title_words = re.split(r"\s+", (title or "").strip())
        fallback = _clean_artist_candidate(" ".join(title_words[:3]).title())
        if fallback:
            candidates.append(fallback)

    deduped: list[str] = []
    seen = set()
    for c in candidates:
        key = c.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(c)
    return deduped[:3]


def _store_uploaded_image_bytes(
    *,
    current_user_id: str,
    image_bytes: bytes,
    file_ext: str,
    original_filename: str,
) -> dict:
    file_id = str(uuid.uuid4())
    ext = (file_ext or "").lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".webm"]:
        ext = ".jpg"
    filename = f"{file_id}{ext}"
    file_path = UPLOADS_DIR / filename
    with open(file_path, "wb") as buffer:
        buffer.write(image_bytes)
    upload_doc = {
        "id": file_id,
        "user_id": current_user_id,
        "original_filename": original_filename,
        "stored_filename": filename,
        "file_type": "image",
        "file_path": str(file_path),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    return {"file_id": file_id, "filename": original_filename, "upload_doc": upload_doc}


async def llm_chat(
    system_message: str,
    user_message: str,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    provider: str | None = None,
    model: str | None = None,
    user_id: str | None = None,  # For cost tracking
) -> str:
    client, settings = _get_llm_client(provider_override=provider, model_override=model)
    response = await client.chat.completions.create(
        model=settings["model"],
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )

    # Track usage
    if response.usage:
        await track_llm_usage(
            user_id=user_id,
            usage_type="chat",
            prompt_tokens=response.usage.prompt_tokens,
            completion_tokens=response.usage.completion_tokens
        )

    return (response.choices[0].message.content or "").strip()


async def llm_chat_with_image(
    system_message: str,
    user_message: str,
    image_bytes: bytes,
    image_mime: str,
    temperature: float = 0.5,
    max_tokens: int | None = None,
    provider: str | None = None,
    model: str | None = None,
    user_id: str | None = None,  # For cost tracking
) -> str:
    selected_provider = (provider or os.environ.get("LLM_PROVIDER", "grok")).lower()
    selected_model = model or _get_vision_model_for_provider(selected_provider)
    client, settings = _get_llm_client(provider_override=selected_provider, model_override=selected_model)
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    image_url = f"data:{image_mime};base64,{image_b64}"
    payload_messages = [
        {"role": "system", "content": system_message},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": user_message},
                {"type": "image_url", "image_url": {"url": image_url}},
            ],
        },
    ]

    async def _send_request(active_client, active_settings):
        return await active_client.chat.completions.create(
            model=active_settings["model"],
            messages=payload_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    try:
        response = await _send_request(client, settings)
    except Exception as first_error:
        err_text = str(first_error).lower()
        image_not_supported = (
            "image inputs are not supported" in err_text
            or "does not support image" in err_text
            or "images are not supported" in err_text
            or "invalid request content" in err_text
        )
        can_fallback_to_openai = (
            selected_provider != "openai" and bool(os.environ.get("OPENAI_API_KEY"))
        )
        if image_not_supported and can_fallback_to_openai:
            fallback_model = _get_vision_model_for_provider("openai")
            client, settings = _get_llm_client(
                provider_override="openai",
                model_override=fallback_model
            )
            response = await _send_request(client, settings)
        else:
            raise

    # Track usage
    if response.usage:
        await track_llm_usage(
            user_id=user_id,
            usage_type="vision",
            prompt_tokens=response.usage.prompt_tokens,
            completion_tokens=response.usage.completion_tokens
        )

    return (response.choices[0].message.content or "").strip()


# ============ Models ============
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    reminder_email_enabled: bool = False
    reminder_sms_enabled: bool = False
    reminder_time: str = "12:00"
    reminder_tz: str = "America/Los_Angeles"
    reminder_last_sent: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class ReminderSettingsRequest(BaseModel):
    email_enabled: bool = False
    sms_enabled: bool = False
    email: Optional[str] = None
    phone: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class Description(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    content: str
    is_ai_generated: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DescriptionCreate(BaseModel):
    title: str
    content: str
    is_ai_generated: bool = False

class DescriptionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class RefineDescriptionRequest(BaseModel):
    description: str

class GenerateDescriptionRequest(BaseModel):
    email: Optional[str] = None
    socials: Optional[str] = None
    key: Optional[str] = None
    bpm: Optional[str] = None
    prices: Optional[str] = None
    additional_info: Optional[str] = None

class TagGenerationRequest(BaseModel):
    query: str
    custom_tags: Optional[List[str]] = []  # User's custom tags
    llm_provider: Optional[str] = None  # "openai" or "grok"

class TagHistorySaveRequest(BaseModel):
    query: str
    tags: List[str]

class TagJoinRequest(BaseModel):
    queries: List[str]
    candidate_tags: List[str]
    max_tags: int = 120
    llm_provider: Optional[str] = None  # "openai" or "grok"

class TagJoinResponse(BaseModel):
    tags: List[str]

class TagGenerationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    query: str
    tags: List[str]
    debug: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TagDebugResponse(BaseModel):
    id: str
    query: str
    debug: Dict[str, Any]

class YouTubeUploadRequest(BaseModel):
    title: str
    description_id: str
    tags_id: Optional[str] = None
    privacy_status: str = "public"  # public, unlisted, private

class YouTubeConnectionStatus(BaseModel):
    connected: bool
    email: Optional[str] = None
    profile_picture: Optional[str] = None
    name: Optional[str] = None

class YouTubeAnalyticsResponse(BaseModel):
    channel_name: str
    subscriber_count: int
    total_views: int
    total_videos: int
    recent_videos: List[dict]
    insights: dict  # Contains what_works, needs_improvement, recommendations, growth_strategy

class BeatAnalysisRequest(BaseModel):
    title: str
    tags: List[str]
    description: str = ""

class BeatAnalysisResponse(BaseModel):
    overall_score: int  # 0-100
    title_score: int
    tags_score: int
    seo_score: int
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    predicted_performance: str  # "Poor", "Average", "Good", "Excellent"

class BeatFixRequest(BaseModel):
    title: str
    tags: List[str]
    description: str = ""
    analysis: BeatAnalysisResponse

class BeatFixResponse(BaseModel):
    title: str
    tags: List[str]
    description: str
    applied_fixes: dict
    notes: Optional[str] = None

class ThumbnailCheckResponse(BaseModel):
    score: int  # 0-100 overall thumbnail quality
    verdict: str
    strengths: List[str]
    issues: List[str]
    suggestions: List[str]
    text_overlay_suggestion: str
    branding_suggestion: str

class GeneratedImageResult(BaseModel):
    id: str
    image_url: str
    thumbnail_url: Optional[str] = None
    artist: Optional[str] = None
    query_used: Optional[str] = None
    source: str
    credit_name: Optional[str] = None
    credit_url: Optional[str] = None

class ImageGenerateRequest(BaseModel):
    title: str
    tags: List[str] = []
    k: int = 6

class ImageGenerateResponse(BaseModel):
    query_used: str
    detected_artists: List[str]
    results: List[GeneratedImageResult]

class UploadImageFromUrlRequest(BaseModel):
    image_url: str
    original_filename: Optional[str] = None

class GrowthStreak(BaseModel):
    user_id: str
    current_streak: int = 0
    longest_streak: int = 0
    total_days_completed: int = 0
    challenge_start_date: Optional[str] = None
    last_checkin_date: Optional[str] = None
    badges_earned: List[str] = []
    calendar: dict = {}  # date: {status: str, activity: str}

class CheckinResponse(BaseModel):
    success: bool
    message: str
    current_streak: int
    total_days: int
    badge_unlocked: Optional[str] = None

class SubscriptionStatus(BaseModel):
    is_subscribed: bool
    plan: Literal["free", "pro"]
    daily_credits_remaining: int
    daily_credits_total: int
    upload_credits_remaining: int
    upload_credits_total: int
    resets_at: Optional[str] = None

class CheckoutSessionRequest(BaseModel):
    success_url: str
    cancel_url: str

class ThemeGenerateRequest(BaseModel):
    prompt: str = ""
    mode: str = "auto"  # "light" | "dark" | "auto"

class ThemeGenerateResponse(BaseModel):
    theme_name: str
    description: str
    variables: Dict[str, str]


THEME_ALLOWED_VARIABLES = {
    "--bg-primary",
    "--bg-secondary",
    "--bg-tertiary",
    "--text-primary",
    "--text-secondary",
    "--accent-primary",
    "--accent-secondary",
    "--border-color",
    "--card-bg",
    "--shadow",
    "--glow",
}


def _extract_json_object(text: str) -> dict:
    if not text:
        raise ValueError("Empty LLM response")

    candidate = text.strip()

    if "```json" in candidate:
        start = candidate.find("```json") + 7
        end = candidate.find("```", start)
        if end != -1:
            candidate = candidate[start:end].strip()
    elif "```" in candidate:
        start = candidate.find("```") + 3
        end = candidate.find("```", start)
        if end != -1:
            candidate = candidate[start:end].strip()

    if not candidate.startswith("{"):
        match = re.search(r"\{[\s\S]*\}", candidate)
        if match:
            candidate = match.group(0)

    return json.loads(candidate)


def _is_safe_css_value(value: str) -> bool:
    value = (value or "").strip()
    if not value or len(value) > 120:
        return False
    if any(token in value for token in ["{", "}", ";", "@import", "url(", "<", ">"]):
        return False
    return True


def _sanitize_theme_variables(raw_variables: Any) -> Dict[str, str]:
    if not isinstance(raw_variables, dict):
        return {}

    safe: Dict[str, str] = {}
    for key, value in raw_variables.items():
        if key not in THEME_ALLOWED_VARIABLES:
            continue
        if not isinstance(value, str):
            continue
        if not _is_safe_css_value(value):
            continue
        safe[key] = value.strip()
    return safe


# ============ Subscription Helper Functions ============
async def get_user_subscription_status(user_id: str) -> dict:
    """Get user's subscription and credit status"""
    user_doc = await db.users.find_one({"id": user_id})
    
    if not user_doc:
        return {
            "is_subscribed": False, 
            "credits_remaining": 0, 
            "credits_total": 2,
            "upload_credits_remaining": 0,
            "upload_credits_total": 2
        }
    
    # Check if user has active subscription
    is_subscribed = user_doc.get('stripe_subscription_id') and user_doc.get('subscription_status') == 'active'
    
    # Pro users get unlimited (represented as -1)
    if is_subscribed:
        return {
            "is_subscribed": True,
            "plan": "pro",
            "credits_remaining": -1,  # Unlimited
            "credits_total": -1,
            "upload_credits_remaining": -1,  # Unlimited uploads
            "upload_credits_total": -1,
            "resets_at": None
        }
    
    # Free users get 3 AI generations + 3 uploads per day
    today = datetime.now(timezone.utc).date()
    usage_date = user_doc.get('daily_usage_date')
    
    # Parse usage date
    if usage_date:
        if isinstance(usage_date, str):
            usage_date = datetime.fromisoformat(usage_date).date()
        elif isinstance(usage_date, datetime):
            usage_date = usage_date.date()
    
    # Reset credits if it's a new day
    if not usage_date or usage_date < today:
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "daily_usage_count": 0,
                "daily_upload_count": 0,
                "daily_usage_date": today.isoformat()
            }}
        )
        credits_used = 0
        uploads_used = 0
    else:
        credits_used = user_doc.get('daily_usage_count', 0)
        uploads_used = user_doc.get('daily_upload_count', 0)
    
    credits_remaining = max(0, 3 - credits_used)
    upload_credits_remaining = max(0, 3 - uploads_used)
    
    # Calculate reset time (midnight UTC)
    tomorrow = today + timedelta(days=1)
    resets_at = datetime.combine(tomorrow, datetime.min.time(), tzinfo=timezone.utc).isoformat()
    
    return {
        "is_subscribed": False,
        "plan": "free",
        "credits_remaining": credits_remaining,
        "credits_total": 3,
        "upload_credits_remaining": upload_credits_remaining,
        "upload_credits_total": 3,
        "resets_at": resets_at
    }

async def check_and_use_credit(user_id: str, consume: bool = True) -> bool:
    """Check if user has credits and optionally use one. Returns True if allowed."""
    status = await get_user_subscription_status(user_id)
    
    # Pro users always have access
    if status['is_subscribed']:
        return True
    
    # Free users need credits
    if status['credits_remaining'] <= 0:
        return False
    
    if consume:
        # Use one credit
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"daily_usage_count": 1}}
        )
    
    return True

async def consume_credit(user_id: str) -> None:
    """Consume one credit for free users after a successful operation."""
    status = await get_user_subscription_status(user_id)
    if status['is_subscribed']:
        return
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"daily_usage_count": 1}}
    )

async def check_and_use_upload_credit(user_id: str) -> bool:
    """Check if user has upload credits and use one. Returns True if successful."""
    status = await get_user_subscription_status(user_id)
    
    # Pro users always have access
    if status['is_subscribed']:
        return True
    
    # Free users need upload credits
    if status['upload_credits_remaining'] <= 0:
        return False
    
    # Use one upload credit
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"daily_upload_count": 1}}
    )
    
    return True

async def ensure_has_credit(user_id: str, feature_name: str = "generations") -> None:
    """
    Check if user has credits. If not, raise HTTPException(402).
    Does not consume credit here; consumer must call consume_credit() later.
    """
    has_credit = await check_and_use_credit(user_id, consume=False)
    if not has_credit:
        status = await get_user_subscription_status(user_id)
        raise HTTPException(
            status_code=402,
            detail={
                "message": f"Daily limit reached. Upgrade to Pro for unlimited {feature_name}!",
                "resets_at": status.get('resets_at')
            }
        )


# ============ Auth Helper Functions ============
def create_access_token(user_id: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION)
    to_encode = {"sub": user_id, "username": username, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        username = payload.get("username")
        if user_id is None or username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user_id, "username": username}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Auth Routes ============
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    hashed_password = bcrypt.hash(user_data.password)
    
    # Create user
    user = User(username=user_data.username)
    user_doc = user.model_dump()
    user_doc['password_hash'] = hashed_password
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Generate token
    access_token = create_access_token(user.id, user.username)
    
    return TokenResponse(access_token=access_token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"username": user_data.username})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not bcrypt.verify(user_data.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate token
    access_token = create_access_token(user_doc['id'], user_doc['username'])
    
    user = User(
        id=user_doc['id'],
        username=user_doc['username'],
        created_at=datetime.fromisoformat(user_doc['created_at']) if isinstance(user_doc['created_at'], str) else user_doc['created_at']
    )
    
    return TokenResponse(access_token=access_token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user['id']}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

@api_router.post("/theme/generate", response_model=ThemeGenerateResponse)
async def generate_theme(request: ThemeGenerateRequest, current_user: dict = Depends(get_current_user)):
    status = await get_user_subscription_status(current_user['id'])
    if not status.get("is_subscribed"):
        raise HTTPException(
            status_code=402,
            detail="AI Theme Generator is a Pro feature. Upgrade to Pro to generate custom AI themes."
        )

    mode = (request.mode or "auto").strip().lower()
    if mode not in {"auto", "light", "dark"}:
        mode = "auto"

    user_prompt = (request.prompt or "").strip()
    if not user_prompt:
        user_prompt = "Create a premium producer dashboard theme that feels modern, bold, and readable."

    system_message = (
        "You design website color themes. "
        "Return only JSON with keys: theme_name, description, variables. "
        "variables must include only these CSS variables: "
        "--bg-primary, --bg-secondary, --bg-tertiary, --text-primary, --text-secondary, "
        "--accent-primary, --accent-secondary, --border-color, --card-bg, --shadow, --glow. "
        "Use valid CSS color values only (hex, rgb/rgba, hsl/hsla). No prose."
    )

    llm_input = (
        f"Mode preference: {mode}\n"
        f"Prompt: {user_prompt}\n"
        "Output example:\n"
        "{\n"
        "  \"theme_name\": \"Ocean Pulse\",\n"
        "  \"description\": \"Deep blue neon producer UI\",\n"
        "  \"variables\": {\n"
        "    \"--bg-primary\": \"#0b1220\",\n"
        "    \"--bg-secondary\": \"#111a2d\",\n"
        "    \"--bg-tertiary\": \"#16233c\",\n"
        "    \"--text-primary\": \"#e5f0ff\",\n"
        "    \"--text-secondary\": \"#9ec5ff\",\n"
        "    \"--accent-primary\": \"#3b82f6\",\n"
        "    \"--accent-secondary\": \"#60a5fa\",\n"
        "    \"--border-color\": \"rgba(96, 165, 250, 0.35)\",\n"
        "    \"--card-bg\": \"rgba(14, 23, 40, 0.75)\",\n"
        "    \"--shadow\": \"rgba(5, 9, 20, 0.45)\",\n"
        "    \"--glow\": \"rgba(59, 130, 246, 0.35)\"\n"
        "  }\n"
        "}"
    )

    try:
        response_text = await llm_chat(
            system_message=system_message,
            user_message=llm_input,
            temperature=0.85,
            max_tokens=500,
            user_id=current_user.get("id"),
        )
        parsed = _extract_json_object(response_text)
        variables = _sanitize_theme_variables(parsed.get("variables"))
        if len(variables) < 6:
            raise ValueError("Insufficient theme variables returned by LLM")

        return ThemeGenerateResponse(
            theme_name=str(parsed.get("theme_name") or "AI Theme").strip()[:60],
            description=str(parsed.get("description") or "Generated with Grok").strip()[:180],
            variables=variables,
        )
    except Exception as exc:
        logging.error(f"Failed to generate AI theme: {str(exc)}")
        raise HTTPException(status_code=500, detail="Failed to generate AI theme")


# ============ YouTube OAuth Routes ============
@api_router.get("/youtube/auth-url")
async def get_youtube_auth_url(current_user: dict = Depends(get_current_user)):
    """Get the Google OAuth URL for YouTube access"""
    if GOOGLE_CLIENT_ID == 'your_google_client_id_here':
        raise HTTPException(
            status_code=400,
            detail="Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env"
        )
    
    # Create OAuth URL with YouTube upload and readonly scopes
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': f"{os.environ.get('FRONTEND_URL', 'https://tagbeats.preview.emergentagent.com')}/youtube-callback",
        'response_type': 'code',
        'scope': 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email',
        'access_type': 'offline',
        'prompt': 'consent',
        'state': current_user['id']
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"auth_url": auth_url}

@api_router.post("/youtube/connect")
async def connect_youtube(code: str = Form(...), current_user: dict = Depends(get_current_user)):
    """Exchange authorization code for tokens and store them"""
    try:
        # Exchange code for tokens manually to avoid scope validation issues
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": f"{os.environ.get('FRONTEND_URL', 'https://tagbeats.preview.emergentagent.com')}/youtube-callback",
            "grant_type": "authorization_code"
        }
        
        token_response = requests.post(token_url, data=data)
        if token_response.status_code != 200:
            raise Exception(f"Token exchange failed: {token_response.text}")
        
        tokens = token_response.json()
        
        # Create credentials from tokens
        credentials = Credentials(
            token=tokens['access_token'],
            refresh_token=tokens.get('refresh_token'),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET
        )
        
        # Get user email from Google
        oauth2_service = build('oauth2', 'v2', credentials=credentials)
        user_info = oauth2_service.userinfo().get().execute()
        
        # Calculate token expiry (default 1 hour from now)
        token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
        
        # Store credentials in database with profile picture
        await db.youtube_connections.update_one(
            {"user_id": current_user['id']},
            {
                "$set": {
                    "user_id": current_user['id'],
                    "google_email": user_info.get('email'),
                    "profile_picture": user_info.get('picture'),  # Add profile picture
                    "name": user_info.get('name'),  # Add name
                    "access_token": tokens['access_token'],
                    "refresh_token": tokens.get('refresh_token'),
                    "token_expiry": token_expiry.isoformat(),
                    "connected_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True, 
            "email": user_info.get('email'),
            "profile_picture": user_info.get('picture'),
            "name": user_info.get('name')
        }
        
    except Exception as e:
        logging.error(f"YouTube connection error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to connect YouTube: {str(e)}")

@api_router.get("/youtube/status", response_model=YouTubeConnectionStatus)
async def get_youtube_status(current_user: dict = Depends(get_current_user)):
    """Check if user has connected their YouTube account"""
    connection = await db.youtube_connections.find_one({"user_id": current_user['id']})
    
    if connection:
        return YouTubeConnectionStatus(
            connected=True,
            email=connection.get('google_email'),
            profile_picture=connection.get('profile_picture'),
            name=connection.get('name')
        )
    return YouTubeConnectionStatus(connected=False)

@api_router.delete("/youtube/disconnect")
async def disconnect_youtube(current_user: dict = Depends(get_current_user)):
    """Disconnect YouTube account"""
    await db.youtube_connections.delete_one({"user_id": current_user['id']})
    return {"success": True, "message": "YouTube account disconnected"}

@api_router.post("/youtube/analytics", response_model=YouTubeAnalyticsResponse)
async def get_youtube_analytics(current_user: dict = Depends(get_current_user)):
    """Analyze YouTube channel performance and provide AI insights"""
    try:
        # Check if user has credits
        await ensure_has_credit(current_user['id'], "analytics")
        
        # Check if YouTube is connected
        connection = await db.youtube_connections.find_one({"user_id": current_user['id']})
        if not connection:
            raise HTTPException(status_code=400, detail="YouTube account not connected")
        
        # Build YouTube API client using stored tokens
        creds = Credentials(
            token=connection.get('access_token'),
            refresh_token=connection.get('refresh_token'),
            token_uri='https://oauth2.googleapis.com/token',
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=['https://www.googleapis.com/auth/youtube.upload', 
                    'https://www.googleapis.com/auth/youtube.readonly']
        )
        
        # Refresh token if needed
        if creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
            # Update stored token
            await db.youtube_connections.update_one(
                {"user_id": current_user['id']},
                {"$set": {
                    "access_token": creds.token,
                    "token_expiry": datetime.now(timezone.utc) + timedelta(hours=1)
                }}
            )
        
        youtube = build('youtube', 'v3', credentials=creds)
        
        # Get channel statistics
        channels_response = youtube.channels().list(
            part='statistics,snippet',
            mine=True
        ).execute()
        
        if not channels_response.get('items'):
            raise HTTPException(status_code=404, detail="No channel found")
        
        channel = channels_response['items'][0]
        channel_stats = channel['statistics']
        channel_snippet = channel['snippet']
        
        # Get recent videos (last 10)
        search_response = youtube.search().list(
            part='id',
            forMine=True,
            type='video',
            order='date',
            maxResults=10
        ).execute()
        
        video_ids = [item['id']['videoId'] for item in search_response.get('items', [])]
        
        recent_videos = []
        if video_ids:
            videos_response = youtube.videos().list(
                part='snippet,statistics',
                id=','.join(video_ids)
            ).execute()
            
            for video in videos_response.get('items', []):
                video_stats = video['statistics']
                recent_videos.append({
                    'title': video['snippet']['title'],
                    'views': int(video_stats.get('viewCount', 0)),
                    'likes': int(video_stats.get('likeCount', 0)),
                    'comments': int(video_stats.get('commentCount', 0)),
                    'published_at': video['snippet']['publishedAt']
                })
        
        # Calculate engagement metrics
        total_views = sum(v['views'] for v in recent_videos)
        total_likes = sum(v['likes'] for v in recent_videos)
        total_comments = sum(v['comments'] for v in recent_videos)
        avg_views = total_views / len(recent_videos) if recent_videos else 0
        engagement_rate = (total_likes / total_views * 100) if total_views > 0 else 0
        
        # Prepare comprehensive data for AI analysis
        analysis_prompt = f"""You are a YouTube SEO expert and growth strategist specializing in helping beat producers blow up their channels like Internet Money did. Analyze this channel deeply and provide COMPREHENSIVE, ACTIONABLE advice.

CHANNEL DATA:
- Subscribers: {channel_stats.get('subscriberCount', '0')}
- Total Views: {channel_stats.get('viewCount', '0')}
- Total Videos: {channel_stats.get('videoCount', '0')}
- Average Views per Video (last 10): {avg_views:.0f}
- Engagement Rate: {engagement_rate:.2f}%

RECENT VIDEOS PERFORMANCE:
{json.dumps(recent_videos, indent=2)}

YOUR MISSION: Help this producer grow their channel from where they are now to 100K+ subscribers. They're a BEGINNER who needs specific, step-by-step guidance.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanation before or after. Just pure JSON.

Provide your analysis in this EXACT JSON format (be DETAILED and SPECIFIC):
{{
  "channel_health_score": "X/100 - Brief explanation of why",
  
  "what_works": [
    "Specific strength 1 with data/evidence",
    "Specific strength 2 with data/evidence", 
    "Specific strength 3 with data/evidence",
    "Specific strength 4 with data/evidence"
  ],
  
  "critical_issues": [
    "Critical problem 1 - Why it's hurting growth",
    "Critical problem 2 - Why it's hurting growth",
    "Critical problem 3 - Why it's hurting growth",
    "Critical problem 4 - Why it's hurting growth"
  ],
  
  "seo_optimization": [
    "Title strategy: Specific formula/template to use",
    "Description strategy: What to include in first 150 characters",
    "Tag strategy: Types of tags to prioritize (high-volume vs long-tail)",
    "Thumbnail strategy: Specific visual elements that work for beats",
    "Upload timing: Best days/times for music content"
  ],
  
  "content_strategy": [
    "Video format recommendation: What type of videos to make",
    "Upload frequency: How often to post and why",
    "Niche positioning: Specific sub-genre or style to focus on",
    "Collaboration strategy: Who to work with and how",
    "Series ideas: 2-3 specific series concepts to start"
  ],
  
  "immediate_actions": [
    "Action 1: Do THIS specific thing in next 24 hours",
    "Action 2: Do THIS specific thing this week",
    "Action 3: Do THIS specific thing this month",
    "Action 4: Start THIS habit from today",
    "Action 5: Stop doing THIS immediately"
  ],
  
  "discoverability_tactics": [
    "Tactic 1: Specific method to appear in more searches",
    "Tactic 2: How to leverage trending sounds/artists",
    "Tactic 3: Cross-platform promotion strategy",
    "Tactic 4: Community engagement approach",
    "Tactic 5: Algorithm hack specific to beat producers"
  ],
  
  "growth_roadmap": "A detailed 3-4 paragraph roadmap explaining: (1) Where they are now and why, (2) The exact path to 10K subs with timeline, (3) The path from 10K to 100K, (4) Specific metrics to track weekly. Be like a mentor giving a pep talk with concrete steps.",
  
  "internet_money_lessons": [
    "Lesson 1: Specific tactic Internet Money used that this producer should copy",
    "Lesson 2: Another Internet Money growth strategy to implement",
    "Lesson 3: How Internet Money handled [specific challenge] and how to apply it"
  ]
}}

CRITICAL RULES:
- Be BRUTALLY HONEST but ENCOURAGING
- Give SPECIFIC numbers, formulas, and templates
- Include EXAMPLES of good titles, descriptions, tags
- Reference real artists/producers when relevant
- Explain the "WHY" behind every recommendation
- Assume they know NOTHING about YouTube SEO
- Make it feel like a 1-on-1 coaching session
- Focus on DISCOVERABILITY and GROWTH, not just quality content
"""
        
        # Get AI insights with enhanced system message
        response = await llm_chat(
            system_message="You are a top YouTube growth consultant who has helped music producers grow from 0 to 1M+ subscribers. You specialize in beat producer channels and understand YouTube's algorithm deeply. You give specific, tactical advice like a mentor. You reference successful producers like Internet Money, Nick Mira, Kyle Beats as examples. You're encouraging but brutally honest about what needs to change.",
            user_message=analysis_prompt,
        )
        
        # Parse AI response - handle markdown code blocks
        try:
            # Try to extract JSON from markdown code blocks
            response_text = response.strip()
            
            # Check if response is wrapped in markdown code blocks
            if '```json' in response_text:
                # Extract JSON from ```json ... ```
                start = response_text.find('```json') + 7
                end = response_text.find('```', start)
                response_text = response_text[start:end].strip()
            elif '```' in response_text:
                # Extract JSON from ``` ... ```
                start = response_text.find('```') + 3
                end = response_text.find('```', start)
                response_text = response_text[start:end].strip()
            
            insights = json.loads(response_text)
            
        except Exception as e:
            logging.error(f"Failed to parse analytics response: {str(e)}")
            logging.error(f"Response preview: {response[:500]}")
            
            # Fallback if JSON parsing fails
            insights = {
                "channel_health_score": "75/100 - Analysis complete but response format needs adjustment",
                "what_works": [
                    "Your channel is being analyzed",
                    "Data has been collected successfully",
                    "AI insights are being generated",
                    "Check back in a moment for full details"
                ],
                "critical_issues": [
                    "AI response formatting issue detected",
                    "We're working on parsing the detailed analysis",
                    "Your data is safe and analysis is complete",
                    "Try again in a moment for full insights"
                ],
                "seo_optimization": [
                    "Loading SEO recommendations...",
                    "Analysis in progress",
                    "Please try again"
                ],
                "content_strategy": [
                    "Loading content strategy...",
                    "Analysis in progress",
                    "Please try again"
                ],
                "immediate_actions": [
                    "Action 1: Try analyzing again for full insights",
                    "Action 2: Your data has been successfully collected",
                    "Action 3: AI is processing your channel information",
                    "Action 4: Full detailed analysis coming soon",
                    "Action 5: Continue creating content while we optimize"
                ],
                "discoverability_tactics": [
                    "Loading discoverability tactics...",
                    "Analysis in progress",
                    "Please try again"
                ],
                "growth_roadmap": "Your comprehensive growth roadmap is being generated. The AI has analyzed your channel but encountered a formatting issue. Please try the analysis again in a moment for your full personalized roadmap including specific steps to grow from your current position to 10K and beyond.",
                "internet_money_lessons": [
                    "Loading Internet Money lessons...",
                    "Analysis in progress",
                    "Please try again"
                ]
            }
        
        await consume_credit(current_user['id'])
        return YouTubeAnalyticsResponse(
            channel_name=channel_snippet['title'],
            subscriber_count=int(channel_stats.get('subscriberCount', 0)),
            total_views=int(channel_stats.get('viewCount', 0)),
            total_videos=int(channel_stats.get('videoCount', 0)),
            recent_videos=recent_videos,
            insights=insights
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"YouTube analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze channel: {str(e)}")




# ============ Grow in 120 Routes ============
@api_router.post("/growth/start")
async def start_growth_challenge(current_user: dict = Depends(get_current_user)):
    """Start the 120-day growth challenge"""
    try:
        # Check if user already has an active challenge
        existing = await db.growth_streaks.find_one({"user_id": current_user['id']})
        
        if existing:
            return {
                "success": False,
                "message": "You're already in the challenge!",
                "current_streak": existing.get('current_streak', 0)
            }
        
        # Create new challenge
        today = datetime.now(timezone.utc).date().isoformat()
        growth_data = {
            "user_id": current_user['id'],
            "current_streak": 0,
            "longest_streak": 0,
            "total_days_completed": 0,
            "challenge_start_date": today,
            "last_checkin_date": None,
            "badges_earned": [],
            "calendar": {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.growth_streaks.insert_one(growth_data)
        
        return {
            "success": True,
            "message": "Welcome to Grow in 120! Your journey starts today 🔥",
            "current_streak": 0
        }
        
    except Exception as e:
        logging.error(f"Error starting growth challenge: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/growth/checkin", response_model=CheckinResponse)
async def daily_checkin(current_user: dict = Depends(get_current_user)):
    """Manual daily check-in - requires user to have completed work today"""
    try:
        today = datetime.now(timezone.utc).date().isoformat()
        
        # Check if user did any work today
        work_done = False
        
        # Check for tag generation today
        tag_today = await db.tag_generations.find_one({
            "user_id": current_user['id'],
            "created_at": {"$gte": today}
        })
        
        # Check for description activity today
        desc_today = await db.descriptions.find_one({
            "user_id": current_user['id'],
            "$or": [
                {"created_at": {"$gte": today}},
                {"updated_at": {"$gte": today}}
            ]
        })
        
        # If no work done, reject check-in
        if not tag_today and not desc_today:
            return CheckinResponse(
                success=False,
                message="⚠️ You must generate tags, create a description, or upload to YouTube before checking in!",
                current_streak=0,
                total_days=0
            )
        
        work_done = True
        
        # Get or create growth streak
        growth = await db.growth_streaks.find_one({"user_id": current_user['id']})
        
        if not growth:
            # Auto-start challenge on first checkin
            growth = {
                "user_id": current_user['id'],
                "current_streak": 0,
                "longest_streak": 0,
                "total_days_completed": 0,
                "challenge_start_date": today,
                "last_checkin_date": None,
                "badges_earned": [],
                "calendar": {}
            }
            await db.growth_streaks.insert_one(growth)
        
        # Check if already checked in today
        if growth.get('last_checkin_date') == today:
            return CheckinResponse(
                success=False,
                message="You've already checked in today! Come back tomorrow 🔥",
                current_streak=growth.get('current_streak', 0),
                total_days=growth.get('total_days_completed', 0)
            )
        
        # Calculate streak
        last_checkin = growth.get('last_checkin_date')
        current_streak = growth.get('current_streak', 0)
        
        if last_checkin:
            last_date = datetime.fromisoformat(last_checkin).date()
            today_date = datetime.fromisoformat(today).date()
            days_diff = (today_date - last_date).days
            
            if days_diff == 1:
                # Consecutive day - increment streak
                current_streak += 1
            elif days_diff > 1:
                # Missed days - reset streak
                current_streak = 1
        else:
            # First checkin
            current_streak = 1
        
        # Update totals
        total_days = growth.get('total_days_completed', 0) + 1
        longest_streak = max(growth.get('longest_streak', 0), current_streak)
        
        # Update calendar with activity
        calendar = growth.get('calendar', {})
        
        # Determine activity type based on what was done today
        activity_done = "manual_checkin"  # default
        
        # Check what activity was actually done
        if tag_today:
            activity_done = "tag_generation"
        elif desc_today:
            activity_done = "description_work"
        
        calendar[today] = {
            "status": "completed",
            "activity": activity_done
        }
        
        # Check for badge unlocks
        badge_unlocked = None
        badges = growth.get('badges_earned', [])
        
        milestone_badges = {
            7: "🔥 Week Warrior",
            30: "💪 30-Day Champion",
            60: "⭐ Halfway Hero",
            90: "🚀 90-Day Legend",
            120: "👑 Elite Producer"
        }
        
        for days, badge in milestone_badges.items():
            if total_days >= days and badge not in badges:
                badges.append(badge)
                badge_unlocked = badge
                break
        
        # Update database
        await db.growth_streaks.update_one(
            {"user_id": current_user['id']},
            {"$set": {
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "total_days_completed": total_days,
                "last_checkin_date": today,
                "badges_earned": badges,
                "calendar": calendar
            }}
        )
        
        message = f"Day {total_days} complete! 🔥 {current_streak}-day streak!"
        if badge_unlocked:
            message += f" Badge unlocked: {badge_unlocked}"
        
        return CheckinResponse(
            success=True,
            message=message,
            current_streak=current_streak,
            total_days=total_days,
            badge_unlocked=badge_unlocked
        )
        
    except Exception as e:
        logging.error(f"Error with daily checkin: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/growth/status", response_model=GrowthStreak)
async def get_growth_status(current_user: dict = Depends(get_current_user)):
    """Get user's growth challenge status"""
    try:
        growth = await db.growth_streaks.find_one(
            {"user_id": current_user['id']},
            {"_id": 0}
        )
        
        if not growth:
            # Return default/empty state
            return GrowthStreak(
                user_id=current_user['id'],
                current_streak=0,
                longest_streak=0,
                total_days_completed=0,
                challenge_start_date=None,
                last_checkin_date=None,
                badges_earned=[],
                calendar={}
            )
        
        return GrowthStreak(**growth)
        
    except Exception as e:
        logging.error(f"Error fetching growth status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/growth/calendar")
async def get_growth_calendar(current_user: dict = Depends(get_current_user)):
    """Get 120-day calendar view"""
    try:
        growth = await db.growth_streaks.find_one({"user_id": current_user['id']})
        
        if not growth or not growth.get('challenge_start_date'):
            return {
                "calendar": {},
                "days_remaining": 120,
                "progress_percentage": 0
            }
        
        start_date = datetime.fromisoformat(growth['challenge_start_date']).date()
        today = datetime.now(timezone.utc).date()
        calendar = growth.get('calendar', {})
        
        # Generate full 120-day calendar
        full_calendar = {}
        for i in range(120):
            date = (start_date + timedelta(days=i)).isoformat()
            date_obj = datetime.fromisoformat(date).date()
            
            if date in calendar:
                full_calendar[date] = calendar[date]
            elif date_obj < today:
                full_calendar[date] = 'missed'
            elif date_obj == today:
                full_calendar[date] = 'today'
            else:
                full_calendar[date] = 'future'
        
        total_days = growth.get('total_days_completed', 0)
        days_remaining = max(0, 120 - total_days)
        progress_percentage = min(100, (total_days / 120) * 100)
        
        return {
            "calendar": full_calendar,
            "days_remaining": days_remaining,
            "progress_percentage": progress_percentage,
            "start_date": start_date.isoformat()
        }
        
    except Exception as e:
        logging.error(f"Error fetching calendar: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Subscription Routes ============
@api_router.get("/subscription/status", response_model=SubscriptionStatus)
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    """Get user's subscription and credit status"""
    status = await get_user_subscription_status(current_user['id'])
    return SubscriptionStatus(
        is_subscribed=status['is_subscribed'],
        plan=status['plan'],
        daily_credits_remaining=status['credits_remaining'],
        daily_credits_total=status['credits_total'],
        upload_credits_remaining=status['upload_credits_remaining'],
        upload_credits_total=status['upload_credits_total'],
        resets_at=status.get('resets_at')
    )

@api_router.post("/subscription/create-checkout")
async def create_checkout_session(request: CheckoutSessionRequest, current_user: dict = Depends(get_current_user)):
    """Create Stripe checkout session"""
    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.get('email'),
            client_reference_id=current_user['id'],
            line_items=[{
                'price': os.environ['STRIPE_PRICE_ID'],
                'quantity': 1,
            }],
            mode='subscription',
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata={
                'user_id': current_user['id']
            }
        )
        
        return {"checkout_url": checkout_session.url}
        
    except Exception as e:
        logging.error(f"Stripe checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create checkout: {str(e)}")

@api_router.post("/subscription/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.environ.get('STRIPE_WEBHOOK_SECRET', '')
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id') or session.get('metadata', {}).get('user_id')
        
        if user_id:
            # Activate subscription
            subscription_id = session.get('subscription')
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "stripe_customer_id": session.get('customer'),
                    "stripe_subscription_id": subscription_id,
                    "subscription_status": "active",
                    "subscribed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logging.info(f"Subscription activated for user {user_id}")
    
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        customer_id = subscription['customer']
        
        # Find user by customer ID
        user_doc = await db.users.find_one({"stripe_customer_id": customer_id})
        if user_doc:
            await db.users.update_one(
                {"id": user_doc['id']},
                {"$set": {"subscription_status": subscription['status']}}
            )
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        customer_id = subscription['customer']
        
        # Find user by customer ID
        user_doc = await db.users.find_one({"stripe_customer_id": customer_id})
        if user_doc:
            await db.users.update_one(
                {"id": user_doc['id']},
                {"$set": {
                    "subscription_status": "cancelled",
                    "stripe_subscription_id": None
                }}
            )
    
    return {"status": "success"}

@api_router.get("/subscription/config")
async def get_subscription_config():
    """Get Stripe configuration for frontend"""
    return {
        "publishable_key": os.environ.get('STRIPE_PUBLISHABLE_KEY'),
        "price_id": os.environ['STRIPE_PRICE_ID']
    }

@api_router.post("/subscription/portal")
async def create_customer_portal_session(current_user: dict = Depends(get_current_user)):
    """Create Stripe Customer Portal session for subscription management"""
    try:
        user_doc = await db.users.find_one({"id": current_user['id']})
        
        if not user_doc or not user_doc.get('stripe_customer_id'):
            raise HTTPException(status_code=400, detail="No active subscription found")
        
        # Create portal session
        portal_session = stripe.billing_portal.Session.create(
            customer=user_doc['stripe_customer_id'],
            return_url=f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/dashboard"
        )
        
        return {"url": portal_session.url}
        
    except Exception as e:
        logging.error(f"Portal session error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Tag Generation Routes ============
_TAG_NOISE_WORDS = {
    "type", "beat", "beats", "instrumental", "instrumentals", "style",
    "prod", "producer", "free", "download", "copyright", "no", "official",
    "audio", "video", "lyrics", "remix",
}

_LOW_INTENT_EXACT_TAGS = {
    "beat", "beats", "music", "instrumental music", "vibe", "vibes",
    "chill beat", "rap beat", "trap beat",
}

_GENERIC_BEAT_MODIFIERS = {
    "vibe", "energy", "flow", "sound", "street", "club", "wavy",
    "banger", "hard", "emotional", "melodic", "dark", "sad", "hype",
    "inspired", "style", "producer",
}


def _clean_tag_text(value: str) -> str:
    clean = (value or "").strip().strip(",").strip('"').strip("'")
    clean = re.sub(r"\s+", " ", clean)
    return clean


def _normalize_artist_query(query: str) -> str:
    text = (query or "").lower()
    text = re.sub(r"\b(type beat|type|beat|style|instrumental)\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _tag_exact_key(tag: str) -> str:
    key = (tag or "").lower()
    key = re.sub(r"[^a-z0-9\s]", " ", key)
    key = re.sub(r"\s+", " ", key).strip()
    return key


def _tag_semantic_key(tag: str) -> str:
    key = _tag_exact_key(tag)
    if not key:
        return ""

    semantic_tokens: list[str] = []
    for token in key.split():
        if re.fullmatch(r"20\d{2}", token):
            continue
        if token in _TAG_NOISE_WORDS:
            continue
        semantic_tokens.append(token)

    semantic = " ".join(semantic_tokens).strip()
    return semantic or key


def _is_low_intent_tag(tag: str) -> bool:
    key = _tag_exact_key(tag)
    if not key:
        return True
    if key in _LOW_INTENT_EXACT_TAGS:
        return True
    if len(key) < 3 or len(key) > 72:
        return True
    return False


def _append_unique_tags(base_tags: list[str], extra_tags: list[str], max_tags: int) -> list[str]:
    final_tags = list(base_tags)
    seen_exact = {_tag_exact_key(tag) for tag in final_tags}
    seen_semantic = {_tag_semantic_key(tag) for tag in final_tags}

    for raw in extra_tags:
        clean = _clean_tag_text(raw)
        if not clean or _is_low_intent_tag(clean):
            continue

        exact_key = _tag_exact_key(clean)
        semantic_key = _tag_semantic_key(clean)
        if not exact_key or exact_key in seen_exact:
            continue
        if semantic_key and semantic_key in seen_semantic:
            continue

        seen_exact.add(exact_key)
        if semantic_key:
            seen_semantic.add(semantic_key)
        final_tags.append(clean)

        if len(final_tags) >= max_tags:
            break

    return final_tags


def _is_generic_artist_modifier_tag(tag: str, artist_name: str, seed_tokens: set[str]) -> bool:
    key = _tag_exact_key(tag)
    if not key:
        return True

    tokens = key.split()
    if len(tokens) < 3:
        return False

    artist_parts = [p for p in _tag_exact_key(artist_name).split() if p]
    if artist_parts and not all(part in tokens for part in artist_parts):
        return False

    # If tag includes any known song/project token, keep it.
    if seed_tokens and any(token in seed_tokens for token in tokens):
        return False

    # Drop artist + generic modifier + beat style patterns.
    if "beat" not in tokens:
        return False
    if any(mod in tokens for mod in _GENERIC_BEAT_MODIFIERS):
        return True
    return False


def _extract_song_seed(title: str, artist_name: str = "") -> str:
    seed = re.split(r'[\(\[\|]', (title or ""))[0].strip()
    seed = re.sub(r'\s+', ' ', seed)
    if not seed:
        return ""

    if artist_name:
        artist_prefix = re.compile(rf'^\s*{re.escape(artist_name)}\s*[-:]\s*', re.IGNORECASE)
        seed = artist_prefix.sub("", seed).strip()

    if not seed or len(seed) > 55:
        return ""
    if "type beat" in seed.lower():
        return ""
    return seed


def _fetch_spotify_track_seeds(artist_name: str) -> list[str]:
    client_id = os.environ.get("SPOTIFY_CLIENT_ID")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    if not artist_name or not client_id or not client_secret:
        return []

    try:
        token_response = requests.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret),
            timeout=8,
        )
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        if not access_token:
            return []

        headers = {"Authorization": f"Bearer {access_token}"}

        artist_search = requests.get(
            "https://api.spotify.com/v1/search",
            params={"q": artist_name, "type": "artist", "limit": 1},
            headers=headers,
            timeout=8,
        )
        artist_search.raise_for_status()
        artists = (((artist_search.json() or {}).get("artists") or {}).get("items") or [])
        if not artists:
            return []

        artist_id = artists[0].get("id")
        if not artist_id:
            return []

        top_tracks = requests.get(
            f"https://api.spotify.com/v1/artists/{artist_id}/top-tracks",
            params={"market": "US"},
            headers=headers,
            timeout=8,
        )
        top_tracks.raise_for_status()
        tracks = (top_tracks.json() or {}).get("tracks") or []

        seeds: list[str] = []
        for track in tracks[:10]:
            name = (track or {}).get("name", "")
            seed = _extract_song_seed(name, artist_name)
            if seed:
                seeds.append(seed)
        return seeds
    except Exception as e:
        logging.warning(f"Spotify enrichment failed: {str(e)}")
        return []


def _fetch_soundcloud_track_seeds(artist_name: str) -> list[str]:
    client_id = os.environ.get("SOUNDCLOUD_CLIENT_ID")
    if not artist_name or not client_id:
        return []

    try:
        response = requests.get(
            "https://api-v2.soundcloud.com/search/tracks",
            params={
                "q": artist_name,
                "client_id": client_id,
                "limit": 12,
            },
            timeout=8,
        )
        response.raise_for_status()
        collection = (response.json() or {}).get("collection") or []

        seeds: list[str] = []
        for item in collection[:12]:
            title = (item or {}).get("title", "")
            seed = _extract_song_seed(title, artist_name)
            if seed:
                seeds.append(seed)
        return seeds
    except Exception as e:
        logging.warning(f"SoundCloud enrichment failed: {str(e)}")
        return []


def _fetch_youtube_track_seeds_no_api(artist_name: str) -> list[str]:
    if not artist_name:
        return []

    try:
        response = requests.get(
            "https://www.youtube.com/results",
            params={"search_query": f"{artist_name} official audio"},
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                              "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            },
            timeout=10,
        )
        response.raise_for_status()
        text = response.text

        # Parse common YouTube title patterns from initial page payload.
        raw_titles = re.findall(r'"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"', text)
        if not raw_titles:
            raw_titles = re.findall(r'"title"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"', text)

        seeds: list[str] = []
        seen: set[str] = set()
        for raw in raw_titles[:60]:
            title = html.unescape(raw.replace("\\u0026", "&"))
            seed = _extract_song_seed(title, artist_name)
            if not seed:
                continue
            key = seed.lower()
            if key in seen:
                continue
            seen.add(key)
            seeds.append(seed)
            if len(seeds) >= 12:
                break
        return seeds
    except Exception as e:
        logging.warning(f"YouTube no-key enrichment failed: {str(e)}")
        return []


@api_router.post("/tags/generate", response_model=TagGenerationResponse)
async def generate_tags(request: TagGenerationRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Check if user has credits
        await ensure_has_credit(current_user['id'], "generations")
        
        # Extract artist name from query (e.g., "drake type beat" -> "drake")
        artist_name = _normalize_artist_query(request.query)
        
        # Search YouTube for artist's popular songs
        youtube_type_beat_tags: list[str] = []
        source_status = {
            "youtube": "missing",
            "spotify": "missing",
            "soundcloud": "missing",
        }
        try:
            # Get user's YouTube credentials if available for search
            user = await db.users.find_one({"id": current_user['id']})
            if user and user.get('youtube_token'):
                credentials_dict = user['youtube_token']
                credentials = Credentials(**credentials_dict)
                youtube = build('youtube', 'v3', credentials=credentials)
                source_status["youtube"] = "youtube_oauth"
            else:
                youtube_api_key = os.environ.get("YOUTUBE_API_KEY") or os.environ.get("GOOGLE_API_KEY")
                if not youtube_api_key:
                    raise RuntimeError("Missing YOUTUBE_API_KEY/GOOGLE_API_KEY")
                youtube = build('youtube', 'v3', developerKey=youtube_api_key)
                source_status["youtube"] = "youtube_api_key"
            
            # Search for artist's popular songs
            search_response = youtube.search().list(
                q=artist_name,
                part='snippet',
                type='video',
                videoCategoryId='10',  # Music category
                order='viewCount',  # Get most popular
                maxResults=10
            ).execute()
            
            # Extract popular song/title seeds and create one strong variation per title.
            for item in search_response.get('items', []):
                title = item['snippet']['title']
                song_seed = _extract_song_seed(title, artist_name)
                if not song_seed:
                    continue
                youtube_type_beat_tags.append(f"{song_seed} type beat")
            
            logging.info(f"Found {len(youtube_type_beat_tags)} YouTube song variations for {artist_name}")
        except Exception as e:
            logging.warning(f"YouTube search for popular songs failed: {str(e)}")
            fallback_youtube_seeds = await asyncio.to_thread(_fetch_youtube_track_seeds_no_api, artist_name)
            youtube_type_beat_tags = [f"{seed} type beat" for seed in fallback_youtube_seeds]
            source_status["youtube"] = "youtube_web_fallback" if fallback_youtube_seeds else "youtube_failed"

        spotify_seeds, soundcloud_seeds = await asyncio.gather(
            asyncio.to_thread(_fetch_spotify_track_seeds, artist_name),
            asyncio.to_thread(_fetch_soundcloud_track_seeds, artist_name),
        )

        spotify_type_beat_tags = [f"{seed} type beat" for seed in spotify_seeds]
        soundcloud_type_beat_tags = [f"{seed} type beat" for seed in soundcloud_seeds]
        source_status["spotify"] = "spotify_ok" if spotify_type_beat_tags else "spotify_missing_or_failed"
        source_status["soundcloud"] = "soundcloud_ok" if soundcloud_type_beat_tags else "soundcloud_missing_or_failed"

        source_seed_tokens: set[str] = set()
        for seed in [*youtube_type_beat_tags, *spotify_type_beat_tags, *soundcloud_type_beat_tags]:
            for token in _tag_exact_key(seed).split():
                if token in _TAG_NOISE_WORDS or len(token) <= 2:
                    continue
                source_seed_tokens.add(token)
        
        llm_provider = request.llm_provider.lower() if request.llm_provider else None
        if llm_provider not in (None, "openai", "grok"):
            raise HTTPException(status_code=400, detail="Invalid llm_provider. Use 'openai' or 'grok'.")

        # Generate a refined final list only (no blind appending afterwards)
        target_count = 64
        custom_input_tags = [tag.strip() for tag in (request.custom_tags or []) if tag and tag.strip()]
        candidate_pool: list[str] = []
        candidate_source_map: dict[str, str] = {}

        for source_name, tags in [
            ("youtube", youtube_type_beat_tags[:28]),
            ("spotify", spotify_type_beat_tags[:18]),
            ("soundcloud", soundcloud_type_beat_tags[:18]),
            ("custom", custom_input_tags[:40]),
        ]:
            for tag in tags:
                candidate_pool.append(tag)
                key = _tag_exact_key(tag)
                if key and key not in candidate_source_map:
                    candidate_source_map[key] = source_name

        unique_candidate_pool = _append_unique_tags([], candidate_pool, max_tags=80)
        source_priority_pool = []
        for candidate in unique_candidate_pool:
            source = candidate_source_map.get(_tag_exact_key(candidate), "")
            if source in {"youtube", "spotify", "soundcloud"}:
                source_priority_pool.append(candidate)

        candidate_tags_text = ", ".join(unique_candidate_pool[:80]) if unique_candidate_pool else "None"
        prompt = f"""Create ONE refined YouTube tag set for: "{request.query}".

GOAL:
- Maximize discoverability for beat producers.
- Keep tags tightly relevant and high-intent.
- Return exactly {target_count} tags (or as close as possible, min 50).

STRICT RULES:
1) NO generic/filler tags like "chill beat", "vibe", "music", "instrumental music".
2) NO redundant near-duplicates. Do NOT output multiple wording swaps for the same base keyword.
3) Focus on search intent: artist type-beat terms, close related artists, specific subgenre/mood/tempo, era/project/song influence.
4) Keep most tags short and practical (2-5 words), but allow a few long-tail queries.
5) Every tag must be useful for THIS exact query context.
6) If candidates are provided, use only the strongest ones (do not include all).
7) Avoid low-value producer-only terms unless directly relevant: "free download", "no copyright", "fl studio", "logic pro", "ableton".
8) Return STRICT JSON only in this schema:
{{"tags":["tag1","tag2","tag3"]}}
9) If song-based candidates are provided, include at least 10 tags directly based on those song/title candidates.
10) Avoid generic artist+modifier tags like "artist emotional beat", "artist vibe beat", "artist flow beat" unless tied to a real song/project reference.

Required diversity mix (approximate):
- 20-24 core artist/search intent tags
- 10-14 adjacent artist crossover tags
- 10-14 subgenre/mood/tempo tags
- 8-12 era/project/song influence tags
- 4-8 long-tail discovery tags

Optional candidate inspirations from YouTube/Spotify/SoundCloud/custom inputs:
{candidate_tags_text}
"""
        
        response = await llm_chat(
            system_message="You are an expert YouTube SEO specialist for beat producers. Produce a refined, high-intent final tag list only. Return strict JSON.",
            user_message=prompt,
            provider=llm_provider,
        )
        
        # Parse AI-generated tags (JSON first, then fallback to comma split)
        tags_text = response.strip()
        if "```json" in tags_text:
            start = tags_text.find("```json") + 7
            end = tags_text.find("```", start)
            tags_text = tags_text[start:end].strip()
        elif "```" in tags_text:
            start = tags_text.find("```") + 3
            end = tags_text.find("```", start)
            tags_text = tags_text[start:end].strip()

        parsed_tags = []
        try:
            parsed = json.loads(tags_text)
            if isinstance(parsed, dict) and isinstance(parsed.get("tags"), list):
                parsed_tags = parsed["tags"]
        except Exception:
            parsed_tags = [tag.strip() for tag in tags_text.split(",") if tag.strip()]

        final_tags: list[str] = []
        selected_tags_debug: list[dict[str, str]] = []
        dropped_debug: list[dict[str, str]] = []
        seen_exact: set[str] = set()
        seen_semantic: set[str] = set()

        def try_push_tag(raw_tag: str, source: str, accepted_reason: str, max_tags: int) -> None:
            if len(final_tags) >= max_tags:
                if len(dropped_debug) < 80:
                    dropped_debug.append({"tag": raw_tag, "reason": "limit_reached"})
                return

            clean = _clean_tag_text(raw_tag)
            if not clean:
                return

            if _is_low_intent_tag(clean):
                if len(dropped_debug) < 80:
                    dropped_debug.append({"tag": clean, "reason": "low_intent"})
                return

            exact_key = _tag_exact_key(clean)
            semantic_key = _tag_semantic_key(clean)
            if not exact_key:
                return
            if exact_key in seen_exact:
                if len(dropped_debug) < 80:
                    dropped_debug.append({"tag": clean, "reason": "duplicate_exact"})
                return
            if semantic_key and semantic_key in seen_semantic:
                if len(dropped_debug) < 80:
                    dropped_debug.append({"tag": clean, "reason": "duplicate_semantic"})
                return

            seen_exact.add(exact_key)
            if semantic_key:
                seen_semantic.add(semantic_key)
            final_tags.append(clean)
            selected_tags_debug.append(
                {
                    "tag": clean,
                    "source": source,
                    "reason": accepted_reason,
                }
            )

        for tag in [t for t in parsed_tags if isinstance(t, str)]:
            if _is_generic_artist_modifier_tag(tag, artist_name, source_seed_tokens):
                if len(dropped_debug) < 80:
                    dropped_debug.append({"tag": _clean_tag_text(tag), "reason": "generic_artist_modifier"})
                continue
            try_push_tag(tag, "llm", "llm_high_intent", max_tags=80)

        llm_selected_count = len(final_tags)

        # Force song/project seed coverage before broader top-up.
        for seed_tag in source_priority_pool:
            try_push_tag(seed_tag, candidate_source_map.get(_tag_exact_key(seed_tag), "source"), "song_seed_priority", max_tags=80)
            if len([t for t in selected_tags_debug if t.get("reason") == "song_seed_priority"]) >= 20:
                break

        # If model under-returns, top up carefully from candidate pool
        if len(final_tags) < 50:
            for candidate in unique_candidate_pool:
                source = candidate_source_map.get(_tag_exact_key(candidate), "candidate")
                try_push_tag(candidate, source, "candidate_top_up", max_tags=64)
                if len(final_tags) >= 64:
                    break

        # Hard safety limit
        final_tags = final_tags[:80]
        selected_tags_debug = selected_tags_debug[:80]

        source_counts = {
            "youtube_seed_tags": len(youtube_type_beat_tags),
            "spotify_seed_tags": len(spotify_type_beat_tags),
            "soundcloud_seed_tags": len(soundcloud_type_beat_tags),
            "custom_input_tags": len(custom_input_tags),
            "llm_raw_tags": len([t for t in parsed_tags if isinstance(t, str)]),
            "llm_selected_tags": llm_selected_count,
            "final_tags": len(final_tags),
        }

        debug_info = {
            "query": request.query,
            "artist_seed": artist_name,
            "source_status": source_status,
            "source_counts": source_counts,
            "top_up_used": len(final_tags) > llm_selected_count,
            "selected_tags": selected_tags_debug,
            "dropped_tags": dropped_debug,
        }

        logging.info(
            f"Generated refined tags: {len(final_tags)} final, "
            f"{len(unique_candidate_pool)} candidates considered"
        )
        
        # Save to database
        tag_gen = TagGenerationResponse(
            user_id=current_user['id'],
            query=request.query,
            tags=final_tags,
            debug=debug_info,
        )
        
        tag_doc = tag_gen.model_dump()
        tag_doc['created_at'] = tag_doc['created_at'].isoformat()
        
        await db.tag_generations.insert_one(tag_doc)
        
        # Auto check-in for Grow in 120 (same logic as upload)
        try:
            today = datetime.now(timezone.utc).date().isoformat()
            growth = await db.growth_streaks.find_one({"user_id": current_user['id']})
            
            if growth and growth.get('last_checkin_date') != today:
                last_checkin = growth.get('last_checkin_date')
                current_streak = growth.get('current_streak', 0)
                
                if last_checkin:
                    last_date = datetime.fromisoformat(last_checkin).date()
                    today_date = datetime.fromisoformat(today).date()
                    days_diff = (today_date - last_date).days
                    
                    if days_diff == 1:
                        current_streak += 1
                    elif days_diff > 1:
                        current_streak = 1
                else:
                    current_streak = 1
                
                total_days = growth.get('total_days_completed', 0) + 1
                longest_streak = max(growth.get('longest_streak', 0), current_streak)
                calendar = growth.get('calendar', {})
                calendar[today] = {
                    "status": "completed",
                    "activity": "tag_generation"
                }
                
                await db.growth_streaks.update_one(
                    {"user_id": current_user['id']},
                    {"$set": {
                        "current_streak": current_streak,
                        "longest_streak": longest_streak,
                        "total_days_completed": total_days,
                        "last_checkin_date": today,
                        "calendar": calendar
                    }}
                )
                logging.info(f"Auto check-in on tag generation for user {current_user['id']}")
        except Exception as e:
            logging.error(f"Auto checkin on tags failed: {str(e)}")
        
        await consume_credit(current_user['id'])
        return tag_gen
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating tags: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate tags: {str(e)}")

@api_router.get("/tags/history", response_model=List[TagGenerationResponse])
async def get_tag_history(current_user: dict = Depends(get_current_user)):
    tag_docs = await db.tag_generations.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
    
    for doc in tag_docs:
        if isinstance(doc['created_at'], str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    
    return [TagGenerationResponse(**doc) for doc in tag_docs]


@api_router.get("/tags/debug/{tag_id}", response_model=TagDebugResponse)
async def get_tag_debug(tag_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.tag_generations.find_one(
        {"id": tag_id, "user_id": current_user["id"]},
        {"_id": 0, "id": 1, "query": 1, "debug": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Tag generation not found.")
    if not isinstance(doc.get("debug"), dict):
        raise HTTPException(status_code=404, detail="No debug data available for this generation.")

    return TagDebugResponse(
        id=doc["id"],
        query=doc.get("query", ""),
        debug=doc["debug"],
    )

@api_router.post("/tags/history", response_model=TagGenerationResponse)
async def save_tag_history(request: TagHistorySaveRequest, current_user: dict = Depends(get_current_user)):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    if not request.tags:
        raise HTTPException(status_code=400, detail="Tags are required")

    seen = set()
    unique_tags = []
    for tag in request.tags:
        tag_clean = tag.strip()
        if not tag_clean:
            continue
        tag_key = tag_clean.lower()
        if tag_key in seen:
            continue
        seen.add(tag_key)
        unique_tags.append(tag_clean)

    if len(unique_tags) > 120:
        raise HTTPException(status_code=400, detail="Tag limit exceeded (max 120)")

    tag_gen = TagGenerationResponse(
        user_id=current_user['id'],
        query=request.query.strip(),
        tags=unique_tags
    )

    tag_doc = tag_gen.model_dump()
    tag_doc['created_at'] = tag_doc['created_at'].isoformat()
    await db.tag_generations.insert_one(tag_doc)
    return tag_gen


@api_router.post("/tags/join-ai", response_model=TagJoinResponse)
async def join_tags_ai(request: TagJoinRequest, current_user: dict = Depends(get_current_user)):
    if not request.queries or len(request.queries) < 2:
        raise HTTPException(status_code=400, detail="At least two tag queries are required.")
    if len(request.queries) > 3:
        raise HTTPException(status_code=400, detail="You can join up to 3 tag generations at once.")
    if not request.candidate_tags:
        raise HTTPException(status_code=400, detail="Candidate tags are required.")

    await ensure_has_credit(current_user['id'], "generations")

    max_tags = max(10, min(120, request.max_tags or 120))
    llm_provider = request.llm_provider.lower() if request.llm_provider else None
    if llm_provider not in (None, "openai", "grok"):
        raise HTTPException(status_code=400, detail="Invalid llm_provider. Use 'openai' or 'grok'.")

    candidate_tags = [t.strip() for t in request.candidate_tags if t and t.strip()]
    unique_candidates = _append_unique_tags([], candidate_tags, max_tags=max_tags)

    query_summary = " x ".join(request.queries)
    target_output = min(max_tags, 70)
    prompt = f"""You are a YouTube SEO expert for beat producers.
We are combining tags from multiple artists to create ONE optimized set of tags.

Artists/queries: {request.queries}

Rules:
1) Select ONLY from the candidate tag list provided.
2) Return about {target_output} tags (max {max_tags}). Never exceed {max_tags}.
3) Prefer high-intent, relevant tags for a "{query_summary} type beat".
4) Avoid tag stuffing or near-duplicate variations.
5) Remove weak/generic terms and keep strongest discoverability tags only.
6) Keep tags short (2-5 words) with a few long-tail searches when useful.
7) Never keep both wording swaps that share the same base meaning (e.g., "x beat" vs "x instrumental" vs "x type beat").

Candidate tags:
{", ".join(unique_candidates)}

Return STRICT JSON:
{{ "tags": ["tag1", "tag2", "..."] }}
"""

    response = await llm_chat(
        system_message="You pick the best, most relevant tags without stuffing. Return JSON only.",
        user_message=prompt,
        provider=llm_provider,
    )

    try:
        response_text = response.strip()
        if '```json' in response_text:
            start = response_text.find('```json') + 7
            end = response_text.find('```', start)
            response_text = response_text[start:end].strip()
        elif '```' in response_text:
            start = response_text.find('```') + 3
            end = response_text.find('```', start)
            response_text = response_text[start:end].strip()

        parsed = json.loads(response_text)
        tags = parsed.get("tags", [])
        if not isinstance(tags, list):
            tags = []

        final_tags = _append_unique_tags([], [t for t in tags if isinstance(t, str)], max_tags=max_tags)

        if not final_tags:
            raise ValueError("No tags returned from AI")

        await consume_credit(current_user['id'])
        return TagJoinResponse(tags=final_tags)
    except Exception as e:
        logging.error(f"Failed to parse AI joined tags: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to join tags with AI.")


# ============ Description Routes ============
@api_router.post("/descriptions", response_model=Description)
async def create_description(desc_data: DescriptionCreate, current_user: dict = Depends(get_current_user)):
    description = Description(
        user_id=current_user['id'],
        title=desc_data.title,
        content=desc_data.content,
        is_ai_generated=desc_data.is_ai_generated
    )
    
    desc_doc = description.model_dump()
    desc_doc['created_at'] = desc_doc['created_at'].isoformat()
    desc_doc['updated_at'] = desc_doc['updated_at'].isoformat()
    
    await db.descriptions.insert_one(desc_doc)
    
    return description

@api_router.get("/descriptions", response_model=List[Description])
async def get_descriptions(current_user: dict = Depends(get_current_user)):
    desc_docs = await db.descriptions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    for doc in desc_docs:
        if isinstance(doc['created_at'], str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
        if isinstance(doc['updated_at'], str):
            doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    
    return [Description(**doc) for doc in desc_docs]

@api_router.put("/descriptions/{description_id}", response_model=Description)
async def update_description(
    description_id: str,
    desc_data: DescriptionUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Find description
    desc_doc = await db.descriptions.find_one({
        "id": description_id,
        "user_id": current_user['id']
    })
    
    if not desc_doc:
        raise HTTPException(status_code=404, detail="Description not found")
    
    # Update fields
    update_data = {}
    if desc_data.title is not None:
        update_data['title'] = desc_data.title
    if desc_data.content is not None:
        update_data['content'] = desc_data.content
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.descriptions.update_one(
        {"id": description_id},
        {"$set": update_data}
    )
    
    # Get updated description
    updated_doc = await db.descriptions.find_one({"id": description_id}, {"_id": 0})
    
    if isinstance(updated_doc['created_at'], str):
        updated_doc['created_at'] = datetime.fromisoformat(updated_doc['created_at'])
    if isinstance(updated_doc['updated_at'], str):
        updated_doc['updated_at'] = datetime.fromisoformat(updated_doc['updated_at'])
    
    return Description(**updated_doc)

@api_router.delete("/descriptions/{description_id}")
async def delete_description(description_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.descriptions.delete_one({
        "id": description_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Description not found")
    
    return {"message": "Description deleted successfully"}

@api_router.post("/descriptions/refine")
async def refine_description(request: RefineDescriptionRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Check if user has credits
        await ensure_has_credit(current_user['id'], "generations")
        prompt = f"""Refine and improve this YouTube beat description:

{request.description}

Make it more engaging, professional, and optimized for YouTube. Keep the same information but improve the structure, flow, and appeal. Return only the refined description."""
        
        response = await llm_chat(
            system_message="You are an expert at refining YouTube beat descriptions to maximize engagement and professionalism.",
            user_message=prompt,
        )
        
        await consume_credit(current_user['id'])
        return {"refined_description": response.strip()}
        
    except Exception as e:
        logging.error(f"Error refining description: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to refine description: {str(e)}")

@api_router.post("/descriptions/generate")
async def generate_description(request: GenerateDescriptionRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Check if user has credits
        await ensure_has_credit(current_user['id'], "generations")
        
        info_parts = []
        if request.key:
            info_parts.append(f"Key: {request.key}")
        if request.bpm:
            info_parts.append(f"BPM: {request.bpm}")
        if request.prices:
            info_parts.append(f"Prices: {request.prices}")
        if request.email:
            info_parts.append(f"Contact Email: {request.email}")
        if request.socials:
            info_parts.append(f"Social Media: {request.socials}")
        if request.additional_info:
            info_parts.append(f"Additional Info: {request.additional_info}")
        
        beat_info = "\n".join(info_parts)
        
        prompt = f"""Create a professional and engaging YouTube beat description using this information:

{beat_info}

The description should:
- Be attention-grabbing and professional
- Include all provided information naturally
- Have clear sections (about the beat, purchase info, contact)
- Use emojis strategically
- Include a call-to-action
- Be optimized for YouTube

Return only the complete description."""
        
        response = await llm_chat(
            system_message="You are an expert at creating compelling YouTube beat descriptions that convert viewers into buyers.",
            user_message=prompt,
        )
        
        await consume_credit(current_user['id'])
        return {"generated_description": response.strip()}
        
    except Exception as e:
        logging.error(f"Error generating description: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate description: {str(e)}")


# ============ File Upload Routes ============
@api_router.post("/upload/audio")
async def upload_audio(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload audio file (MP3, WAV, etc.)"""
    try:
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="No audio file provided.")

        # Validate file type - audio only
        allowed_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Invalid audio file format. Use MP3, WAV, M4A, FLAC, or OGG")
        
        # Create unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_ext}"
        file_path = UPLOADS_DIR / filename
        
        # Save file with chunked reading for better performance
        chunk_size = 1024 * 1024  # 1MB chunks
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                buffer.write(chunk)
        
        # Save metadata to database
        upload_doc = {
            "id": file_id,
            "user_id": current_user['id'],
            "original_filename": file.filename,
            "stored_filename": filename,
            "file_type": "audio",
            "file_path": str(file_path),
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.uploads.insert_one(upload_doc)
        
        return {"file_id": file_id, "filename": file.filename}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Audio upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload audio: {str(e)}")

@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload image file (JPG, PNG, etc.)"""
    try:
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="No image file provided.")

        # Validate file type
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.webm']
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Invalid image file format. Allowed: JPG, PNG, WEBP, WEBM")
        
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file.")

        stored = _store_uploaded_image_bytes(
            current_user_id=current_user["id"],
            image_bytes=image_bytes,
            file_ext=file_ext,
            original_filename=file.filename,
        )
        upload_doc = stored["upload_doc"]
        await db.uploads.insert_one(upload_doc)

        return {"file_id": stored["file_id"], "filename": stored["filename"]}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Image upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@api_router.post("/upload/image-from-url")
async def upload_image_from_url(payload: UploadImageFromUrlRequest, current_user: dict = Depends(get_current_user)):
    """Download image from a remote URL and store it as a normal uploaded image."""
    try:
        image_url = (payload.image_url or "").strip()
        if not image_url:
            raise HTTPException(status_code=400, detail="image_url is required.")
        if not re.match(r"^https?://", image_url, re.IGNORECASE):
            raise HTTPException(status_code=400, detail="image_url must start with http:// or https://")

        resp = requests.get(
            image_url,
            timeout=20,
            stream=True,
            headers={"User-Agent": "SendMyBeat/1.0 (+https://sendmybeat.com)"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=400, detail=f"Failed to fetch image (HTTP {resp.status_code}).")

        content_type = (resp.headers.get("Content-Type") or "").lower()
        if "image/" not in content_type:
            raise HTTPException(status_code=400, detail="URL does not point to an image.")

        max_bytes = 12 * 1024 * 1024  # 12MB
        image_bytes = bytearray()
        for chunk in resp.iter_content(chunk_size=1024 * 1024):
            if not chunk:
                continue
            image_bytes.extend(chunk)
            if len(image_bytes) > max_bytes:
                raise HTTPException(status_code=400, detail="Image is too large (max 12MB).")

        if not image_bytes:
            raise HTTPException(status_code=400, detail="Fetched image is empty.")

        ext_map = {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/webm": ".webm",
        }
        file_ext = ext_map.get(content_type.split(";")[0].strip(), Path(image_url).suffix.lower() or ".jpg")
        original_filename = (payload.original_filename or f"ai-generated{file_ext}").strip()
        if not original_filename.lower().endswith(file_ext):
            original_filename = f"{Path(original_filename).stem}{file_ext}"

        stored = _store_uploaded_image_bytes(
            current_user_id=current_user["id"],
            image_bytes=bytes(image_bytes),
            file_ext=file_ext,
            original_filename=original_filename,
        )
        await db.uploads.insert_one(stored["upload_doc"])
        return {"file_id": stored["file_id"], "filename": stored["filename"]}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"upload_image_from_url error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to import image: {str(e)}")

@api_router.get("/uploads/my-files")
async def get_my_uploads(current_user: dict = Depends(get_current_user)):
    """Get user's uploaded files"""
    uploads = await db.uploads.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    return uploads


# ============ YouTube Helper Functions ============
async def refresh_youtube_token(user_id: str) -> Credentials:
    """Refresh YouTube access token if expired"""
    connection = await db.youtube_connections.find_one({"user_id": user_id})
    if not connection:
        raise HTTPException(status_code=400, detail="YouTube account not connected")
    
    # Parse token expiry - handle both string and datetime formats
    token_expiry = None
    if connection.get('token_expiry'):
        if isinstance(connection['token_expiry'], str):
            token_expiry_str = connection['token_expiry'].replace('Z', '+00:00')
            try:
                token_expiry = datetime.fromisoformat(token_expiry_str)
            except:
                # If parsing fails, set to None (will refresh token)
                token_expiry = None
        elif isinstance(connection['token_expiry'], datetime):
            token_expiry = connection['token_expiry']
        
        # Ensure timezone-aware (convert naive to UTC)
        if token_expiry and token_expiry.tzinfo is None:
            token_expiry = token_expiry.replace(tzinfo=timezone.utc)
    
    # Create credentials WITHOUT expiry to avoid comparison issues
    # We'll manually check expiry ourselves
    credentials = Credentials(
        token=connection['access_token'],
        refresh_token=connection.get('refresh_token'),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET
    )
    
    # Manually check if we should refresh (token older than 50 minutes)
    should_refresh = False
    if token_expiry:
        now_utc = datetime.now(timezone.utc)
        time_until_expiry = token_expiry - now_utc
        # Refresh if less than 10 minutes remaining
        should_refresh = time_until_expiry.total_seconds() < 600
    else:
        # No expiry info, assume we should refresh
        should_refresh = True
    
    if should_refresh:
        logging.info(f"Refreshing YouTube token for user {user_id}")
        
        # Refresh the token
        credentials.refresh(GoogleRequest())
        
        # Update database with new token
        await db.youtube_connections.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "access_token": credentials.token,
                    "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                    "last_refreshed": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        logging.info(f"Token refreshed successfully for user {user_id}")
    
    return credentials


# ============ Beat Analyzer Route ============
@api_router.post("/beat/analyze", response_model=BeatAnalysisResponse)
async def analyze_beat(request: BeatAnalysisRequest, current_user: dict = Depends(get_current_user)):
    """Analyze beat title, tags, and description to predict performance"""
    try:
        # Prepare analysis prompt
        tags_str = ", ".join(request.tags[:50])  # First 50 tags
        
        analysis_prompt = f"""You are a YouTube SEO expert analyzing a beat upload. Evaluate this beat's potential performance:

TITLE: {request.title}

TAGS ({len(request.tags)} total): {tags_str}

DESCRIPTION: {request.description if request.description else "No description provided"}

Analyze and provide ONLY valid JSON in this format:
{{
  "overall_score": 85,
  "title_score": 90,
  "tags_score": 80,
  "seo_score": 85,
  "strengths": [
    "Strength 1",
    "Strength 2",
    "Strength 3"
  ],
  "weaknesses": [
    "Weakness 1",
    "Weakness 2"
  ],
  "suggestions": [
    "Specific actionable suggestion 1",
    "Specific actionable suggestion 2",
    "Specific actionable suggestion 3"
  ],
  "predicted_performance": "Good"
}}

SCORING CRITERIA:
- Title Score (0-100): Is it searchable? Does it include artist name? Type beat format?
- Tags Score (0-100): Relevance and intent matter more than volume. Penalize tag stuffing or off-genre tags.
- SEO Score (0-100): Overall searchability and discoverability
- Overall Score: Average of all scores

PREDICTED PERFORMANCE: "Poor" (0-40), "Average" (41-65), "Good" (66-85), "Excellent" (86-100)

Be honest but encouraging. Focus on actionable improvements.
If tags look stuffed or irrelevant, explicitly say so and recommend a smaller, high-intent set (20-40)."""

        # Get AI analysis
        response = await llm_chat(
            system_message="You are a YouTube SEO expert who helps beat producers optimize their uploads for maximum discoverability. You provide specific, actionable feedback.",
            user_message=analysis_prompt,
        )
        
        # Parse response
        try:
            response_text = response.strip()
            if '```json' in response_text:
                start = response_text.find('```json') + 7
                end = response_text.find('```', start)
                response_text = response_text[start:end].strip()
            elif '```' in response_text:
                start = response_text.find('```') + 3
                end = response_text.find('```', start)
                response_text = response_text[start:end].strip()
            
            analysis = _parse_llm_json_response(response_text)
            
            return BeatAnalysisResponse(**analysis)
            
        except Exception as e:
            logging.error(f"Failed to parse beat analysis: {str(e)}")
            # Return fallback analysis
            return BeatAnalysisResponse(
                overall_score=70,
                title_score=70,
                tags_score=70,
                seo_score=70,
                strengths=["Title looks good", "Tags are present"],
                weaknesses=["Analysis formatting issue"],
                suggestions=["Try analyzing again", "Ensure title includes artist name", "Add more specific tags"],
                predicted_performance="Average"
            )
        
    except Exception as e:
        logging.error(f"Beat analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Producer Spotlight Routes ============
async def _profile_with_role_tag(profile_doc: dict) -> ProducerProfile:
    user_doc = await db.users.find_one({"id": profile_doc.get("user_id")}) or {}
    username = (profile_doc.get("username") or user_doc.get("username") or "").strip()
    username_lc = username.lower()

    role_tag = "Newbie"
    is_creator = (
        (CREATOR_USER_ID and profile_doc.get("user_id") == CREATOR_USER_ID)
        or (CREATOR_USERNAME and username_lc == CREATOR_USERNAME)
    )

    if is_creator:
        role_tag = "Creator"
    elif profile_doc.get("verification_status") == "approved":
        role_tag = "Verified"
    elif user_doc.get("stripe_subscription_id") and user_doc.get("subscription_status") == "active":
        role_tag = "Pro"

    payload = dict(profile_doc)
    payload["username"] = username or profile_doc.get("username") or "producer"
    payload["role_tag"] = role_tag
    if not payload.get("verification_status"):
        payload["verification_status"] = "none"
    return ProducerProfile(**payload)


@api_router.get("/producers/spotlight", response_model=SpotlightResponse)
async def get_producer_spotlight():
    """Get featured, trending, and new producers for the spotlight page"""

    # Get featured producers (manually selected by admin or algorithm)
    featured = await db.producer_profiles.find({"featured": True}).limit(3).to_list(3)

    # Get trending (most likes/views)
    trending = await db.producer_profiles.find().sort("likes", -1).limit(6).to_list(6)

    # Get new
    new_producers = await db.producer_profiles.find().sort("created_at", -1).limit(6).to_list(6)

    featured_profiles = [await _profile_with_role_tag(p) for p in featured]
    trending_profiles = [await _profile_with_role_tag(p) for p in trending]
    new_profiles = [await _profile_with_role_tag(p) for p in new_producers]

    return SpotlightResponse(
        featured_producers=featured_profiles,
        trending_producers=trending_profiles,
        new_producers=new_profiles
    )

@api_router.get("/producers/me", response_model=ProducerProfile)
async def get_my_producer_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's producer profile"""
    profile = await db.producer_profiles.find_one({"user_id": current_user['id']})

    if not profile:
        # Create default profile if not exists
        user = await db.users.find_one({"id": current_user['id']})
        profile = ProducerProfile(
            user_id=current_user['id'],
            username=user['username']
        )
        await db.producer_profiles.insert_one(profile.model_dump())
        return await _profile_with_role_tag(profile.model_dump())

    return await _profile_with_role_tag(profile)

@api_router.put("/producers/me", response_model=ProducerProfile)
async def update_my_producer_profile(
    update_data: ProducerProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's producer profile"""
    # Build update dict
    update_fields = {}
    if update_data.bio is not None:
        update_fields['bio'] = update_data.bio
    if update_data.avatar_url is not None:
        update_fields['avatar_url'] = update_data.avatar_url
    if update_data.top_beat_url is not None:
        update_fields['top_beat_url'] = update_data.top_beat_url
    if update_data.social_links is not None:
        update_fields['social_links'] = update_data.social_links
    if update_data.tags is not None:
        update_fields['tags'] = update_data.tags

    update_fields['updated_at'] = datetime.now(timezone.utc)

    # Update DB
    await db.producer_profiles.update_one(
        {"user_id": current_user['id']},
        {"$set": update_fields},
        upsert=True
    )

    # Return updated
    updated = await db.producer_profiles.find_one({"user_id": current_user['id']})
    return await _profile_with_role_tag(updated)


@api_router.post("/producers/avatar")
async def upload_producer_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a profile avatar and return a data URL that can be saved in profile."""
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid image type. Use JPG, PNG, or WEBP.")

    # Read up to 2MB + 1 byte to check size limit efficiently
    MAX_SIZE = 2 * 1024 * 1024
    image_bytes = await file.read(MAX_SIZE + 1)

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file.")

    if len(image_bytes) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Image too large. Max size is 2MB.")

    avatar_data_url = f"data:{file.content_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}"

    await db.producer_profiles.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"avatar_url": avatar_data_url, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )

    return {"avatar_url": avatar_data_url}


@api_router.post("/producers/verification/apply", response_model=ProducerProfile)
async def apply_for_verification(
    request: VerificationApplicationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Submit verification application. Pro does not auto-grant verification."""
    reason = (request.reason or "").strip()
    if len(reason) < 20:
        raise HTTPException(status_code=400, detail="Please provide a longer verification reason (20+ chars).")

    existing = await db.producer_profiles.find_one({"user_id": current_user["id"]}) or {}
    if existing.get("verification_status") == "approved":
        raise HTTPException(status_code=400, detail="You are already verified.")
    if existing.get("verification_status") == "pending":
        raise HTTPException(status_code=400, detail="Verification application already pending review.")

    user_doc = await db.users.find_one({"id": current_user["id"]}) or {}
    now = datetime.now(timezone.utc)
    username = existing.get("username") or user_doc.get("username") or current_user.get("username") or "producer"

    update_fields = {
        "username": username,
        "verification_status": "pending",
        "verification_note": "Application submitted and awaiting review.",
        "verification_applied_at": now,
        "updated_at": now,
        "verification_application": {
            "stage_name": (request.stage_name or "").strip(),
            "main_platform_url": (request.main_platform_url or "").strip(),
            "notable_work": (request.notable_work or "").strip(),
            "reason": reason,
            "submitted_at": now,
        },
    }

    await db.producer_profiles.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_fields, "$setOnInsert": {"user_id": current_user["id"], "created_at": now}},
        upsert=True,
    )

    updated = await db.producer_profiles.find_one({"user_id": current_user["id"]})
    return await _profile_with_role_tag(updated)


@api_router.post("/producers/verification/review", response_model=ProducerProfile)
async def review_verification_application(
    request: VerificationReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    """Creator/admin-only endpoint to approve or reject verification."""
    actor_username = (current_user.get("username") or "").lower()
    is_creator = (
        (CREATOR_USER_ID and current_user["id"] == CREATOR_USER_ID)
        or (CREATOR_USERNAME and actor_username == CREATOR_USERNAME)
    )
    if not is_creator:
        raise HTTPException(status_code=403, detail="Only creator/admin can review verification applications.")

    action = (request.action or "").strip().lower()
    if action not in {"approve", "reject"}:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'.")

    profile = await db.producer_profiles.find_one({"user_id": request.user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Producer profile not found.")

    now = datetime.now(timezone.utc)
    update_fields = {
        "verification_status": "approved" if action == "approve" else "rejected",
        "verification_note": (request.note or "").strip() or ("Approved by creator" if action == "approve" else "Rejected by creator"),
        "updated_at": now,
    }
    if action == "approve":
        update_fields["verified_at"] = now

    await db.producer_profiles.update_one({"user_id": request.user_id}, {"$set": update_fields})
    updated = await db.producer_profiles.find_one({"user_id": request.user_id})
    return await _profile_with_role_tag(updated)

# ============ Beat Fixes Route ============
@api_router.post("/beat/fix", response_model=BeatFixResponse)
async def fix_beat(request: BeatFixRequest, current_user: dict = Depends(get_current_user)):
    """Apply AI fixes to title/description/tags only when analysis indicates issues."""
    try:
        await ensure_has_credit(current_user['id'], "fixes")

        analysis = request.analysis
        issues_text = " ".join(analysis.weaknesses + analysis.suggestions).lower()

        needs_title = analysis.title_score < 70 or "title" in issues_text
        needs_tags = analysis.tags_score < 70 or "tag" in issues_text
        needs_description = (not request.description.strip()) or ("description" in issues_text) or ("seo" in issues_text)

        if not any([needs_title, needs_tags, needs_description]):
            return BeatFixResponse(
                title=request.title,
                tags=request.tags[:120],
                description=request.description,
                applied_fixes={"title": False, "tags": False, "description": False},
                notes="No critical issues detected. No fixes applied."
            )

        fix_prompt = f"""You are a YouTube beat upload editor. Apply fixes ONLY to areas flagged below.

Inputs:
TITLE: {request.title}
TAGS ({len(request.tags)}): {", ".join(request.tags)}
DESCRIPTION: {request.description if request.description else "No description provided"}

Analysis feedback:
Weaknesses: {analysis.weaknesses}
Suggestions: {analysis.suggestions}

Fix flags:
- title: {"YES" if needs_title else "NO"}
- tags: {"YES" if needs_tags else "NO"}
- description: {"YES" if needs_description else "NO"}

Rules:
1) If a fix flag is NO, return the original value unchanged for that field.
2) Tags must be high-intent, relevant, and NOT stuffed. Max 120 tags. Keep order sensible.
3) Title should be YouTube-searchable with the artist x artist type beat format when relevant.
4) Description must sound like a real producer upload (not an AI response). Keep the user's vibe.
5) If description is fixed, add a short pricing line if missing (e.g., "Lease: $20 | Trackout: $50 | Unlimited: $100").
6) Keep any contact/social links present in the original description.
7) Return STRICT JSON only.

Return JSON schema:
{{
  "title": "string",
  "tags": ["tag1", "tag2"],
  "description": "string",
  "applied_fixes": {{
    "title": true/false,
    "tags": true/false,
    "description": true/false
  }},
  "notes": "short summary"
}}
"""

        try:
            response = await llm_chat(
                system_message="You refine beat uploads for YouTube. Be concise, practical, and keep the creator's style.",
                user_message=fix_prompt,
            )

            response_text = response.strip()
            if '```json' in response_text:
                start = response_text.find('```json') + 7
                end = response_text.find('```', start)
                response_text = response_text[start:end].strip()
            elif '```' in response_text:
                start = response_text.find('```') + 3
                end = response_text.find('```', start)
                response_text = response_text[start:end].strip()

            fixed = json.loads(response_text)

            tags = fixed.get("tags", request.tags)
            if not isinstance(tags, list):
                tags = request.tags
            tags = tags[:120]

            result = BeatFixResponse(
                title=fixed.get("title", request.title),
                tags=tags,
                description=fixed.get("description", request.description),
                applied_fixes=fixed.get("applied_fixes", {
                    "title": needs_title,
                    "tags": needs_tags,
                    "description": needs_description
                }),
                notes=fixed.get("notes")
            )

            await consume_credit(current_user['id'])
            return result
        except Exception as e:
            logging.error(f"Failed to apply beat fixes: {str(e)}")
            await consume_credit(current_user['id'])
            return BeatFixResponse(
                title=request.title,
                tags=request.tags[:120],
                description=request.description,
                applied_fixes={"title": False, "tags": False, "description": False},
                notes="Failed to apply fixes. Please try again."
            )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Beat fix error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ AI Image Suggestions Route ============
@api_router.post("/beat/generate-image", response_model=ImageGenerateResponse)
async def generate_image_suggestions(
    request: ImageGenerateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate artist-aware reference images based on title + selected tags."""
    try:
        title = (request.title or "").strip()
        tags = request.tags or []
        k = max(1, min(int(request.k or 6), 12))
        if not title and not tags:
            raise HTTPException(status_code=400, detail="title or tags are required.")

        artists = _extract_artist_queries(title, tags)
        query = " ".join(artists) if artists else title
        if not query:
            raise HTTPException(status_code=400, detail="Could not infer artist query from title/tags.")

        results: list[dict] = []

        # 1) Pexels (preferred when key exists)
        pexels_key = os.environ.get("PEXELS_API_KEY")
        if pexels_key:
            try:
                pexels_resp = requests.get(
                    "https://api.pexels.com/v1/search",
                    params={"query": query, "per_page": k, "orientation": "landscape"},
                    headers={"Authorization": pexels_key},
                    timeout=15,
                )
                if pexels_resp.status_code < 400:
                    payload = pexels_resp.json()
                    for photo in payload.get("photos", []):
                        src = photo.get("src", {})
                        image_url = src.get("large2x") or src.get("large") or src.get("original")
                        thumb_url = src.get("medium") or src.get("small") or image_url
                        if not image_url:
                            continue
                        results.append({
                            "id": f"pexels-{photo.get('id')}",
                            "image_url": image_url,
                            "thumbnail_url": thumb_url,
                            "artist": artists[0] if artists else None,
                            "query_used": query,
                            "source": "pexels",
                            "credit_name": (photo.get("photographer") or "Pexels Photographer"),
                            "credit_url": photo.get("photographer_url"),
                        })
            except Exception as e:
                logging.warning(f"Pexels image search failed: {str(e)}")

        # 2) Pixabay fallback
        if len(results) < k and os.environ.get("PIXABAY_API_KEY"):
            try:
                needed = k - len(results)
                px_resp = requests.get(
                    "https://pixabay.com/api/",
                    params={
                        "key": os.environ.get("PIXABAY_API_KEY"),
                        "q": query,
                        "image_type": "photo",
                        "per_page": needed,
                        "safesearch": "true",
                    },
                    timeout=15,
                )
                if px_resp.status_code < 400:
                    payload = px_resp.json()
                    for hit in payload.get("hits", []):
                        image_url = hit.get("largeImageURL") or hit.get("webformatURL")
                        thumb_url = hit.get("previewURL") or hit.get("webformatURL") or image_url
                        if not image_url:
                            continue
                        results.append({
                            "id": f"pixabay-{hit.get('id')}",
                            "image_url": image_url,
                            "thumbnail_url": thumb_url,
                            "artist": artists[0] if artists else None,
                            "query_used": query,
                            "source": "pixabay",
                            "credit_name": hit.get("user"),
                            "credit_url": f"https://pixabay.com/users/{hit.get('user', '')}/" if hit.get("user") else None,
                        })
            except Exception as e:
                logging.warning(f"Pixabay image search failed: {str(e)}")

        # 3) Deezer fallback (no key): artist photos
        if len(results) < k:
            try:
                needed = k - len(results)
                dz_resp = requests.get(
                    "https://api.deezer.com/search/artist",
                    params={"q": query},
                    timeout=10,
                )
                if dz_resp.status_code < 400:
                    payload = dz_resp.json()
                    for artist in payload.get("data", [])[:needed]:
                        image_url = artist.get("picture_xl") or artist.get("picture_big") or artist.get("picture_medium")
                        if not image_url:
                            continue
                        results.append({
                            "id": f"deezer-{artist.get('id')}",
                            "image_url": image_url,
                            "thumbnail_url": artist.get("picture_medium") or image_url,
                            "artist": artist.get("name"),
                            "query_used": query,
                            "source": "deezer",
                            "credit_name": artist.get("name"),
                            "credit_url": artist.get("link"),
                        })
            except Exception as e:
                logging.warning(f"Deezer image search failed: {str(e)}")

        deduped: list[dict] = []
        seen = set()
        for item in results:
            url = (item.get("image_url") or "").strip()
            if not url or url in seen:
                continue
            seen.add(url)
            deduped.append(item)

        return ImageGenerateResponse(
            query_used=query,
            detected_artists=artists,
            results=deduped[:k]
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"generate_image_suggestions error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image suggestions: {str(e)}")


# ============ Thumbnail Checker Route ============
@api_router.post("/beat/thumbnail-check", response_model=ThumbnailCheckResponse)
async def check_thumbnail(
    request: Request,
    file: UploadFile | None = File(default=None),
    image_file_id: str = Form(""),
    title: str = Form(""),
    tags: str = Form(""),
    description: str = Form(""),
    llm_provider: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """Analyze a thumbnail image for click potential and clarity"""
    try:
        await ensure_has_credit(current_user['id'], "thumbnail checks")

        if not title.strip() or not tags.strip() or not description.strip():
            raise HTTPException(
                status_code=400,
                detail="Title, tags, and description are required for thumbnail checks."
            )

        image_bytes: bytes | None = None
        image_mime = "image/jpeg"

        if file is not None and getattr(file, "filename", None):
            allowed_types = {"image/jpeg", "image/png", "image/webp"}
            if file.content_type not in allowed_types:
                raise HTTPException(status_code=400, detail="Invalid image type. Use JPG, PNG, or WEBP.")
            image_bytes = await file.read()
            image_mime = file.content_type or image_mime
        elif image_file_id.strip():
            upload = await db.uploads.find_one({"id": image_file_id.strip(), "user_id": current_user["id"], "file_type": "image"})
            if not upload:
                raise HTTPException(status_code=404, detail="Referenced image file not found.")
            path = Path(upload.get("file_path", ""))
            if not path.exists():
                raise HTTPException(status_code=404, detail="Referenced image file is missing on server.")
            image_bytes = path.read_bytes()
            ext = path.suffix.lower()
            image_mime = ".png" == ext and "image/png" or (".webp" == ext and "image/webp" or "image/jpeg")

        if not image_bytes:
            raise HTTPException(status_code=400, detail="No image provided for thumbnail check.")

        analysis_prompt = f"""You are a YouTube beat-thumbnail specialist and active internet-money style producer in LA (~10k subs).
Your job is to improve CTR and retention for TYPE BEAT uploads using a single static image.

Context:
- Video title: "{title}"
- Tags: "{tags}"
- Description (optional): "{description}"

Analyze like a producer who uploads daily and optimizes thumbnails for YouTube search + suggested.
Focus on:
1) Mobile legibility and instant clarity (1-second glance test)
2) Contrast, focal point, and visual hierarchy
3) Relevance to the artist/type beat vibe in the title
4) Simple, repeatable branding (corner badge, color system)
5) Whether text (if any) is minimal, bold, and useful

Avoid irrelevant advice (e.g., motion). Assume the thumbnail is a static image.
Be practical and specific to beat uploads.

Return STRICT JSON with this exact schema:
{{
  "score": 0-100,
  "verdict": "one short sentence",
  "strengths": ["..."],
  "issues": ["..."],
  "suggestions": ["..."],
  "text_overlay_suggestion": "short text idea for the thumbnail",
  "branding_suggestion": "one short branding tweak"
}}
"""

        response_text = await llm_chat_with_image(
            system_message="You are a ruthless but helpful beat-thumbnail critic. Be concise, actionable, and focused on CTR for type beat uploads.",
            user_message=analysis_prompt,
            image_bytes=image_bytes,
            image_mime=image_mime,
            provider=llm_provider,
            max_tokens=600,
        )

        try:
            try:
                analysis = _parse_llm_json_response(response_text)
            except Exception:
                repair_prompt = f"""Convert the following thumbnail analysis into STRICT JSON only.
Do not add commentary. Return exactly one JSON object with this schema:
{{
  "score": 0-100,
  "verdict": "one short sentence",
  "strengths": ["..."],
  "issues": ["..."],
  "suggestions": ["..."],
  "text_overlay_suggestion": "short text idea for the thumbnail",
  "branding_suggestion": "one short branding tweak"
}}

If a field is missing, infer a safe value.

RAW INPUT:
{response_text}
"""
                normalized_text = await llm_chat(
                    system_message="You convert LLM outputs into strict valid JSON objects.",
                    user_message=repair_prompt,
                    temperature=0.0,
                    max_tokens=500,
                    provider=(llm_provider or ("openai" if os.environ.get("OPENAI_API_KEY") else None)),
                    user_id=current_user.get("id"),
                )
                analysis = _parse_llm_json_response(normalized_text)
            if await request.is_disconnected():
                logging.info("Thumbnail check canceled by client; skipping credit use.")
                return ThumbnailCheckResponse(**analysis)
            await consume_credit(current_user['id'])
            return ThumbnailCheckResponse(**analysis)
        except Exception as e:
            logging.error(f"Failed to parse thumbnail analysis: {str(e)} | raw_response={response_text[:1200]}")
            if await request.is_disconnected():
                logging.info("Thumbnail check canceled by client; skipping credit use.")
                return ThumbnailCheckResponse(
                    score=55,
                    verdict="Thumbnail analysis completed but formatting failed.",
                    strengths=["Clear subject or artwork present"],
                    issues=["Unable to parse detailed feedback"],
                    suggestions=["Try again for full details", "Increase contrast and simplify text"],
                    text_overlay_suggestion="FUTURE x UZI TYPE BEAT",
                    branding_suggestion="Add a consistent corner badge with your logo",
                )
            await consume_credit(current_user['id'])
            return ThumbnailCheckResponse(
                score=55,
                verdict="Thumbnail analysis completed but formatting failed.",
                strengths=["Clear subject or artwork present"],
                issues=["Unable to parse detailed feedback"],
                suggestions=["Try again for full details", "Increase contrast and simplify text"],
                text_overlay_suggestion="FUTURE x UZI TYPE BEAT",
                branding_suggestion="Add a consistent corner badge with your logo",
            )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Thumbnail check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze thumbnail: {str(e)}")


# ============ YouTube Upload Routes ============
@api_router.post("/youtube/upload")
async def upload_to_youtube(
    title: str = Form(...),
    description_id: str = Form(...),
    tags_id: str = Form(None),
    privacy_status: str = Form("public"),
    audio_file_id: str = Form(...),
    image_file_id: str = Form(...),
    description_override: Optional[str] = Form(None),
    aspect_ratio: str = Form("16:9"),
    image_scale: float = Form(1.0),
    image_scale_x: Optional[float] = Form(None),
    image_scale_y: Optional[float] = Form(None),
    image_pos_x: float = Form(0.0),
    image_pos_y: float = Form(0.0),
    image_rotation: float = Form(0.0),
    background_color: str = Form("black"),
    remove_watermark: bool = Form(False),
    current_user: dict = Depends(get_current_user)
):
    """Upload video to YouTube with selected description and tags"""
    try:
        logging.info(f"Starting YouTube upload for user {current_user['id']}")
        
        # Check if user wants to remove watermark but is not subscribed
        user_sub_status = await get_user_subscription_status(current_user['id'])
        is_subscribed = user_sub_status.get('is_subscribed', False)
        
        if remove_watermark and not is_subscribed:
            raise HTTPException(
                status_code=402,
                detail={
                    "message": "Watermark removal is a Pro feature. Upgrade to Pro to remove watermarks!",
                    "feature": "remove_watermark"
                }
            )
        
        # Check if user has upload credits
        has_credit = await check_and_use_upload_credit(current_user['id'])
        if not has_credit:
            status = await get_user_subscription_status(current_user['id'])
            raise HTTPException(
                status_code=402,
                detail={
                    "message": "Daily upload limit reached. Upgrade to Pro for unlimited uploads!",
                    "resets_at": status.get('resets_at')
                }
            )
        
        # Get and refresh YouTube credentials if needed
        try:
            credentials = await refresh_youtube_token(current_user['id'])
            logging.info("YouTube credentials refreshed successfully")
        except Exception as e:
            logging.error(f"Error refreshing token: {str(e)}")
            raise
        
        # Get description
        desc_doc = await db.descriptions.find_one({"id": description_id, "user_id": current_user['id']})
        if not desc_doc:
            raise HTTPException(status_code=404, detail="Description not found")
        
        description_text = (description_override or desc_doc['content']).strip()
        promo_line = "Visit www.sendmybeat.com to upload beats for free!"
        if not is_subscribed:
            if description_text.lower().startswith(promo_line.lower()):
                description_text = description_text
            elif description_text:
                description_text = f"{promo_line}\n{description_text}"
            else:
                description_text = promo_line
        
        # Get tags if provided
        tags = []
        if tags_id:
            tags_doc = await db.tag_generations.find_one({"id": tags_id, "user_id": current_user['id']})
            if tags_doc:
                # YouTube tag requirements:
                # - Max 500 characters total for all tags
                # - Each tag max 30 characters
                # - Special characters can cause issues
                raw_tags = tags_doc['tags']
                
                total_chars = 0
                for tag in raw_tags:
                    # Clean tag - remove problematic characters
                    cleaned_tag = tag.strip().replace('"', '').replace("'", '')
                    
                    # Skip if too long or empty
                    if not cleaned_tag or len(cleaned_tag) > 30:
                        continue
                    
                    # Check if adding this tag would exceed limit
                    tag_length = len(cleaned_tag) + 2  # +2 for separator
                    if total_chars + tag_length > 450:  # Leave some buffer
                        break
                    
                    tags.append(cleaned_tag)
                    total_chars += tag_length
                
                logging.info(f"Using {len(tags)} tags (total {total_chars} chars) out of {len(raw_tags)} generated")
        
        # Get uploaded files
        audio_file = await db.uploads.find_one({"id": audio_file_id, "user_id": current_user['id']})
        image_file = await db.uploads.find_one({"id": image_file_id, "user_id": current_user['id']})
        
        if not audio_file or not image_file:
            raise HTTPException(status_code=404, detail="Audio and image files are required")
        
        # Create video from audio + image using ffmpeg
        video_filename = f"{uuid.uuid4()}.mp4"
        video_path = UPLOADS_DIR / video_filename
        
        # Optimized ffmpeg command for large files
        # Try to find ffmpeg, install if not found
        ffmpeg_path = shutil.which('ffmpeg')
        
        if not ffmpeg_path:
            # Try to install ffmpeg if not found
            logging.warning("FFmpeg not found, attempting to install...")
            try:
                install_result = subprocess.run(
                    ['apt-get', 'update'],
                    capture_output=True,
                    timeout=120
                )
                install_result = subprocess.run(
                    ['apt-get', 'install', '-y', 'ffmpeg'],
                    capture_output=True,
                    timeout=300
                )
                ffmpeg_path = shutil.which('ffmpeg')
                if ffmpeg_path:
                    logging.info(f"FFmpeg successfully installed at {ffmpeg_path}")
                else:
                    raise Exception("FFmpeg installation failed")
            except Exception as install_error:
                logging.error(f"Failed to install FFmpeg: {str(install_error)}")
                raise HTTPException(
                    status_code=500,
                    detail="FFmpeg not available. Please contact support or install FFmpeg on the server."
                )
        
        logging.info(f"Using FFmpeg at: {ffmpeg_path}")
        
        aspect_ratio = (aspect_ratio or "16:9").strip()
        aspect_map = {
            "16:9": (1280, 720),
            "1:1": (1080, 1080),
            "9:16": (1080, 1920),
            "4:5": (1080, 1350),
        }
        if aspect_ratio not in aspect_map:
            raise HTTPException(status_code=400, detail="Invalid aspect_ratio. Use 16:9, 1:1, 9:16, or 4:5.")
        target_w, target_h = aspect_map[aspect_ratio]

        scale_x = image_scale_x if image_scale_x is not None else image_scale
        scale_y = image_scale_y if image_scale_y is not None else image_scale

        if not 0.5 <= scale_x <= 2.0:
            raise HTTPException(status_code=400, detail="image_scale_x must be between 0.5 and 2.0.")
        if not 0.5 <= scale_y <= 2.0:
            raise HTTPException(status_code=400, detail="image_scale_y must be between 0.5 and 2.0.")
        if not -1.0 <= image_pos_x <= 1.0:
            raise HTTPException(status_code=400, detail="image_pos_x must be between -1 and 1.")
        if not -1.0 <= image_pos_y <= 1.0:
            raise HTTPException(status_code=400, detail="image_pos_y must be between -1 and 1.")
        if not -180.0 <= image_rotation <= 180.0:
            raise HTTPException(status_code=400, detail="image_rotation must be between -180 and 180 degrees.")

        background_color = (background_color or "black").strip().lower()
        if background_color not in ("black", "white"):
            raise HTTPException(status_code=400, detail="background_color must be black or white.")

        # Always fit inside the target frame to avoid pad errors
        scale_x = min(scale_x, 1.0)
        scale_y = min(scale_y, 1.0)
        fit_expr = f"min({target_w}/iw\\,{target_h}/ih)"

        # Build video filter - add watermark for non-pro users OR pro users who didn't uncheck it
        rotation_filter = ""
        if abs(image_rotation) > 0.01:
            rotation_filter = (
                f"rotate={image_rotation}*PI/180:c={background_color}:ow=rotw(iw):oh=roth(ih),"
            )

        video_filter = (
            f"scale=iw*{fit_expr}*{scale_x}:ih*{fit_expr}*{scale_y},"
            f"{rotation_filter}"
            f"pad={target_w}:{target_h}:(ow-iw)/2+(ow-iw)/2*{image_pos_x}:(oh-ih)/2+(oh-ih)/2*{image_pos_y}:{background_color}"
        )
        
        # Add watermark logic:
        # - Free users: ALWAYS get watermark (remove_watermark is ignored/blocked at API level)
        # - Pro users: Get watermark UNLESS they checked "remove_watermark"
        should_add_watermark = not is_subscribed or not remove_watermark
        
        if should_add_watermark:
            # Add text watermark at the top left with black semi-transparent background
            watermark_text = 'Upload your beats for free: https://sendmybeat.com'
            # Escape special characters for FFmpeg
            watermark_text_escaped = watermark_text.replace(':', r'\:').replace('/', r'\/')
            
            # Add black background box with some padding for better visibility
            video_filter += f",drawtext=text='{watermark_text_escaped}':fontcolor=white:fontsize=20:x=20:y=20:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:box=1:boxcolor=black@0.6:boxborderw=8"
            
            logging.info(f"Adding watermark at top-left with background - User type: {'free' if not is_subscribed else 'pro (chose to keep it)'}")
        else:
            logging.info("Pro user - watermark removed per user request")
        
        audio_ext = Path(audio_file['file_path']).suffix.lower()
        copy_audio = audio_ext in (".mp3", ".m4a", ".aac")

        audio_args = ['-c:a', 'copy'] if copy_audio else ['-c:a', 'aac', '-b:a', '320k', '-ar', '48000']

        ffmpeg_cmd = [
            ffmpeg_path,
            '-loop', '1',
            '-framerate', '0.5',  # 0.5fps for faster processing
            '-i', image_file['file_path'],
            '-i', audio_file['file_path'],
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '28',
            '-tune', 'stillimage',
            *audio_args,
            '-pix_fmt', 'yuv420p',
            # Maintain aspect ratio with black letterboxing/pillarboxing like YouTube + optional watermark
            '-vf', video_filter,
            '-shortest',
            '-movflags', '+faststart',
            '-threads', '0',
            '-y',
            str(video_path)
        ]
        
        logging.info(f"Creating video with ffmpeg: {' '.join(ffmpeg_cmd)}")
        
        try:
            # Run ffmpeg with timeout for large files (10 minutes)
            result = subprocess.run(
                ffmpeg_cmd, 
                capture_output=True, 
                text=True, 
                timeout=600
            )
            
            if result.returncode != 0:
                logging.error(f"FFmpeg error: {result.stderr}")
                raise Exception(f"Video creation failed: {result.stderr[:500]}")
            
            logging.info(f"Video created successfully at {video_path}")
            
        except subprocess.TimeoutExpired:
            logging.error("FFmpeg timeout - file too large")
            raise Exception("Video creation timed out. File may be too large (>150MB).")
        
        # Upload to YouTube
        youtube = build('youtube', 'v3', credentials=credentials)
        
        # Prepare video metadata
        snippet = {
            'title': title[:100],  # YouTube title max 100 chars
            'description': description_text[:5000],  # YouTube description max 5000 chars
            'categoryId': '10'  # Music category
        }
        
        # Only add tags if we have valid ones
        if tags and len(tags) > 0:
            snippet['tags'] = tags
        
        body = {
            'snippet': snippet,
            'status': {
                'privacyStatus': privacy_status,
                'selfDeclaredMadeForKids': False
            }
        }
        
        logging.info(f"Uploading to YouTube with title: {title}, tags: {len(tags)}, privacy: {privacy_status}")
        
        # Use larger chunks for files over 50MB (10MB chunks)
        # This significantly speeds up large file uploads
        file_size = video_path.stat().st_size
        chunk_size = 10*1024*1024 if file_size > 50*1024*1024 else 5*1024*1024
        
        logging.info(f"File size: {file_size / (1024*1024):.1f}MB, using {chunk_size/(1024*1024):.0f}MB chunks")
        media = MediaFileUpload(str(video_path), chunksize=chunk_size, resumable=True)
        
        logging.info(f"Starting YouTube upload with chunked transfer...")
        request = youtube.videos().insert(
            part='snippet,status',
            body=body,
            media_body=media
        )
        
        # Upload in chunks with progress tracking and retries
        response = None
        retries = 0
        max_retries = 5  # More retries for large files
        
        while response is None and retries < max_retries:
            try:
                status, response = request.next_chunk()
                if status:
                    progress = int(status.progress() * 100)
                    logging.info(f"YouTube upload progress: {progress}%")
            except Exception as e:
                logging.error(f"Upload error (retry {retries + 1}/{max_retries}): {str(e)}")
                retries += 1
                if retries >= max_retries:
                    raise Exception(f"YouTube upload failed after {max_retries} retries: {str(e)}")
        
        logging.info(f"Video uploaded successfully! Video ID: {response['id']}")
        
        # Clean up temporary video file
        try:
            video_path.unlink()
            logging.info("Temporary video file deleted")
        except:
            pass
        
        # Auto check-in for Grow in 120 challenge
        try:
            today = datetime.now(timezone.utc).date().isoformat()
            growth = await db.growth_streaks.find_one({"user_id": current_user['id']})
            
            if growth and growth.get('last_checkin_date') != today:
                # Auto checkin on upload
                last_checkin = growth.get('last_checkin_date')
                current_streak = growth.get('current_streak', 0)
                
                if last_checkin:
                    last_date = datetime.fromisoformat(last_checkin).date()
                    today_date = datetime.fromisoformat(today).date()
                    days_diff = (today_date - last_date).days
                    
                    if days_diff == 1:
                        current_streak += 1
                    elif days_diff > 1:
                        current_streak = 1
                else:
                    current_streak = 1
                
                total_days = growth.get('total_days_completed', 0) + 1
                longest_streak = max(growth.get('longest_streak', 0), current_streak)
                calendar = growth.get('calendar', {})
                calendar[today] = {
                    "status": "completed",
                    "activity": "youtube_upload"
                }
                
                await db.growth_streaks.update_one(
                    {"user_id": current_user['id']},
                    {"$set": {
                        "current_streak": current_streak,
                        "longest_streak": longest_streak,
                        "total_days_completed": total_days,
                        "last_checkin_date": today,
                        "calendar": calendar
                    }}
                )
                logging.info(f"Auto check-in complete for user {current_user['id']}")
        except Exception as e:
            logging.error(f"Auto checkin failed: {str(e)}")
            # Don't fail the upload if checkin fails
        
        return {
            "success": True,
            "message": "Video uploaded to YouTube successfully!",
            "video_id": response['id'],
            "video_url": f"https://www.youtube.com/watch?v={response['id']}",
            "title": title,
            "privacy_status": privacy_status,
            "tags_count": len(tags)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"YouTube upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to prepare YouTube upload: {str(e)}")


# ============ Admin Routes ============
@api_router.get("/admin/costs")
async def get_admin_costs(current_user: dict = Depends(get_current_user)):
    """Get estimated backend costs for the current month"""
    # Calculate start of current month
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Aggregate usage logs
    pipeline = [
        {
            "$match": {
                "timestamp": {"$gte": start_of_month}
            }
        },
        {
            "$group": {
                "_id": "$usage_type",
                "total_tokens_in": {"$sum": "$tokens_in"},
                "total_tokens_out": {"$sum": "$tokens_out"},
                "total_cost": {"$sum": "$cost"},
                "count": {"$sum": 1}
            }
        }
    ]

    usage_stats = await db.usage_logs.aggregate(pipeline).to_list(None)

    llm_total = sum(stat["total_cost"] for stat in usage_stats)

    return {
        "month": now.strftime("%B %Y"),
        "hosting_cost": HOSTING_COST,
        "llm_cost": round(llm_total, 4),
        "total_estimated_cost": round(HOSTING_COST + llm_total, 4),
        "details": usage_stats,
        "currency": "USD",
        "note": "Estimates based on usage. Hosting cost is fixed."
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
