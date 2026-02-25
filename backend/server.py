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
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.sendmybeat.com")
CREATOR_USER_ID = os.environ.get("CREATOR_USER_ID", "").strip()
CREATOR_USERNAME = os.environ.get("CREATOR_USERNAME", "deadat18").strip().lower()
ADMIN_USERNAMES = {
    value.strip().lower()
    for value in os.environ.get("ADMIN_USERNAMES", "deadat18").split(",")
    if value.strip()
}
ADMIN_USER_IDS = {
    value.strip()
    for value in os.environ.get("ADMIN_USER_IDS", "").split(",")
    if value.strip()
}
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL')
TEXTBELT_API_KEY = os.environ.get('TEXTBELT_API_KEY')
REMINDER_SERIALIZER = URLSafeSerializer(REMINDER_SECRET)
BEATHELPER_DEFAULT_APPROVAL_TIMEOUT_HOURS = int(os.environ.get("BEATHELPER_DEFAULT_APPROVAL_TIMEOUT_HOURS", "12"))
BEATHELPER_DEFAULT_NOTIFY_CHANNEL = os.environ.get("BEATHELPER_DEFAULT_NOTIFY_CHANNEL", "email").strip().lower()
BEATHELPER_SCHEDULER_INTERVAL_SECONDS = int(os.environ.get("BEATHELPER_SCHEDULER_INTERVAL_SECONDS", "300"))
BEATHELPER_AUTO_DISPATCH_ENABLED = os.environ.get("BEATHELPER_AUTO_DISPATCH_ENABLED", "true").strip().lower() == "true"

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
FREE_DAILY_AI_CREDITS = int(os.environ.get("FREE_DAILY_AI_CREDITS", "2"))
FREE_DAILY_UPLOAD_CREDITS = int(os.environ.get("FREE_DAILY_UPLOAD_CREDITS", "1"))
PLUS_MONTHLY_AI_CREDITS = int(os.environ.get("PLUS_MONTHLY_AI_CREDITS", "220"))
PLUS_MONTHLY_UPLOAD_CREDITS = int(os.environ.get("PLUS_MONTHLY_UPLOAD_CREDITS", "90"))
PLUS_MONTHLY_LLM_COST_CAP_USD = float(os.environ.get("PLUS_MONTHLY_LLM_COST_CAP_USD", "3.25"))
PLUS_NET_REVENUE_USD = float(os.environ.get("PLUS_NET_REVENUE_USD", "4.56"))

# ============ LLM Helper ============
_llm_client = None
_llm_config = None
_beathelper_scheduler_task: asyncio.Task | None = None


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
    stop_words = {
        "type", "beat", "instrumental", "prod", "producer", "free", "download",
        "trap", "drill", "rage", "phonk", "melodic", "dark", "hard", "viral",
        "2022", "2023", "2024", "2025", "2026"
    }

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
            continue

        # e.g. "lil uzi vert beat", "drake instrumental", "future x metro"
        if re.search(r"\b(beat|instrumental)\b", s):
            left = re.split(r"\b(beat|instrumental)\b", s, maxsplit=1)[0]
            parts = re.split(r"\s+x\s+|,|/|&| feat\.?| ft\.? ", left)
            for part in parts:
                c = _clean_artist_candidate(part.title())
                if c:
                    candidates.append(c)
            continue

        # Tag fallback: keep likely name tokens only
        words = [w for w in re.split(r"\s+", s) if w and w not in stop_words and not w.isdigit()]
        if 1 <= len(words) <= 4:
            c = _clean_artist_candidate(" ".join(words).title())
            if c:
                candidates.append(c)

    # Fallback to first words of title if no type-beat pattern
    if not candidates:
        title_words = [w for w in re.split(r"\s+", (title or "").strip()) if w]
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
    plan: Literal["free", "plus", "max"]
    daily_credits_remaining: int
    daily_credits_total: int
    upload_credits_remaining: int
    upload_credits_total: int
    resets_at: Optional[str] = None
    monthly_llm_cost_usd: Optional[float] = None
    cost_guardrail_hit: Optional[bool] = None

class CheckoutSessionRequest(BaseModel):
    success_url: str
    cancel_url: str
    plan: Literal["plus", "max"] = "plus"

class ThemeGenerateRequest(BaseModel):
    prompt: str = ""
    mode: str = "auto"  # "light" | "dark" | "auto"

class ThemeGenerateResponse(BaseModel):
    theme_name: str
    description: str
    variables: Dict[str, str]


class BeatHelperQueueCreateRequest(BaseModel):
    beat_file_id: str
    image_file_id: Optional[str] = None
    beat_type: str
    target_artist: str
    context_tags: List[str] = []
    ai_choose_image: bool = False
    approval_timeout_hours: int = BEATHELPER_DEFAULT_APPROVAL_TIMEOUT_HOURS
    auto_upload_if_no_response: bool = False
    notify_channel: Literal["none", "email", "sms", "email_sms"] = "email"
    privacy_status: Literal["public", "unlisted", "private"] = "public"
    generated_title_override: Optional[str] = None
    template_id: Optional[str] = None


class BeatHelperQueueUpdateRequest(BaseModel):
    status: Literal["queued", "pending_approval", "approved", "skipped", "expired"]


class BeatHelperQueueEditRequest(BaseModel):
    generated_title: Optional[str] = None
    target_artist: Optional[str] = None
    beat_type: Optional[str] = None
    generated_description: Optional[str] = None
    generated_tags: Optional[List[str]] = None
    context_tags: Optional[List[str]] = None
    beat_file_id: Optional[str] = None
    image_file_id: Optional[str] = None
    notify_channel: Optional[Literal["none", "email", "sms", "email_sms"]] = None
    privacy_status: Optional[Literal["public", "unlisted", "private"]] = None
    approval_timeout_hours: Optional[int] = None
    auto_upload_if_no_response: Optional[bool] = None
    template_id: Optional[str] = None


class BeatHelperContactSettingsRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    email_enabled: bool = False
    sms_enabled: bool = False


class BeatHelperTagTemplateCreateRequest(BaseModel):
    name: str
    tags: List[str] = []


class BeatHelperTagTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    tags: Optional[List[str]] = None


class BeatHelperAssistTitleRequest(BaseModel):
    target_artist: str
    beat_type: str
    current_title: Optional[str] = None
    context_tags: List[str] = []


class BeatHelperUserResponseRequest(BaseModel):
    action: Literal["approve", "skip", "change"]
    generated_title: Optional[str] = None
    target_artist: Optional[str] = None
    beat_type: Optional[str] = None
    beat_file_id: Optional[str] = None
    image_file_id: Optional[str] = None


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
def _current_month_key() -> str:
    now = datetime.now(timezone.utc)
    return f"{now.year:04d}-{now.month:02d}"


async def _get_user_monthly_llm_cost(user_id: str) -> float:
    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.usage_logs.aggregate([
        {"$match": {"user_id": user_id, "timestamp": {"$gte": start}}},
        {"$group": {"_id": None, "total_cost": {"$sum": "$cost"}}}
    ]).to_list(1)
    if not result:
        return 0.0
    return float(result[0].get("total_cost") or 0.0)


def _resolve_subscription_plan(user_doc: dict) -> str:
    if not user_doc:
        return "free"
    is_active = bool(user_doc.get('stripe_subscription_id')) and user_doc.get('subscription_status') == 'active'
    if not is_active:
        return "free"
    plan = (user_doc.get("subscription_plan") or "").strip().lower()
    if plan in {"plus", "max"}:
        return plan
    return "plus"


async def _ensure_plus_usage_month(user_id: str, user_doc: dict) -> dict:
    current_month = _current_month_key()
    stored_month = (user_doc.get("plus_usage_month") or "").strip()
    if stored_month == current_month:
        return user_doc
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "plus_usage_month": current_month,
            "plus_monthly_ai_used": 0,
            "plus_monthly_upload_used": 0,
        }}
    )
    user_doc["plus_usage_month"] = current_month
    user_doc["plus_monthly_ai_used"] = 0
    user_doc["plus_monthly_upload_used"] = 0
    return user_doc


async def get_user_subscription_status(user_id: str) -> dict:
    """Get user's subscription and credit status"""
    user_doc = await db.users.find_one({"id": user_id})
    
    if not user_doc:
        return {
            "is_subscribed": False, 
            "credits_remaining": 0, 
            "credits_total": FREE_DAILY_AI_CREDITS,
            "upload_credits_remaining": 0,
            "upload_credits_total": FREE_DAILY_UPLOAD_CREDITS,
            "plan": "free",
            "monthly_llm_cost_usd": 0.0,
            "cost_guardrail_hit": False,
        }
    
    plan = _resolve_subscription_plan(user_doc)

    if plan == "max":
        return {
            "is_subscribed": True,
            "plan": "max",
            "credits_remaining": -1,  # Unlimited
            "credits_total": -1,
            "upload_credits_remaining": -1,  # Unlimited uploads
            "upload_credits_total": -1,
            "resets_at": None,
            "monthly_llm_cost_usd": await _get_user_monthly_llm_cost(user_id),
            "cost_guardrail_hit": False,
        }

    if plan == "plus":
        user_doc = await _ensure_plus_usage_month(user_id, user_doc)
        ai_used = int(user_doc.get("plus_monthly_ai_used") or 0)
        upload_used = int(user_doc.get("plus_monthly_upload_used") or 0)
        llm_cost = await _get_user_monthly_llm_cost(user_id)
        cost_guardrail_hit = llm_cost >= PLUS_MONTHLY_LLM_COST_CAP_USD
        ai_remaining = max(0, PLUS_MONTHLY_AI_CREDITS - ai_used)
        upload_remaining = max(0, PLUS_MONTHLY_UPLOAD_CREDITS - upload_used)
        return {
            "is_subscribed": True,
            "plan": "plus",
            "credits_remaining": ai_remaining,
            "credits_total": PLUS_MONTHLY_AI_CREDITS,
            "upload_credits_remaining": upload_remaining,
            "upload_credits_total": PLUS_MONTHLY_UPLOAD_CREDITS,
            "resets_at": None,
            "monthly_llm_cost_usd": round(llm_cost, 4),
            "cost_guardrail_hit": cost_guardrail_hit,
        }
    
    # Free users get reduced daily credits
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
    
    credits_remaining = max(0, FREE_DAILY_AI_CREDITS - credits_used)
    upload_credits_remaining = max(0, FREE_DAILY_UPLOAD_CREDITS - uploads_used)
    
    # Calculate reset time (midnight UTC)
    tomorrow = today + timedelta(days=1)
    resets_at = datetime.combine(tomorrow, datetime.min.time(), tzinfo=timezone.utc).isoformat()
    
    return {
        "is_subscribed": False,
        "plan": "free",
        "credits_remaining": credits_remaining,
        "credits_total": FREE_DAILY_AI_CREDITS,
        "upload_credits_remaining": upload_credits_remaining,
        "upload_credits_total": FREE_DAILY_UPLOAD_CREDITS,
        "resets_at": resets_at,
        "monthly_llm_cost_usd": await _get_user_monthly_llm_cost(user_id),
        "cost_guardrail_hit": False,
    }

async def check_and_use_credit(user_id: str, consume: bool = True) -> bool:
    """Check if user has credits and optionally use one. Returns True if allowed."""
    status = await get_user_subscription_status(user_id)
    
    # Max users always have access
    if status['plan'] == "max":
        return True
    
    # Plus metering guardrail
    if status['plan'] == "plus":
        if status.get("cost_guardrail_hit"):
            return False
        if status['credits_remaining'] <= 0:
            return False
        if consume:
            await db.users.update_one(
                {"id": user_id},
                {"$inc": {"plus_monthly_ai_used": 1}}
            )
        return True

    # Free users need daily credits
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
    if status['plan'] == "max":
        return
    if status['plan'] == "plus":
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"plus_monthly_ai_used": 1}}
        )
        return
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"daily_usage_count": 1}}
    )

async def check_and_use_upload_credit(user_id: str) -> bool:
    """Check if user has upload credits and use one. Returns True if successful."""
    status = await get_user_subscription_status(user_id)
    
    # Max users always have access
    if status['plan'] == "max":
        return True
    
    if status['plan'] == "plus":
        if status['upload_credits_remaining'] <= 0:
            return False
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"plus_monthly_upload_used": 1}}
        )
        return True

    # Free users need daily upload credits
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
        guardrail_hit = bool(status.get("cost_guardrail_hit"))
        message = f"Limit reached. Upgrade your plan for more {feature_name}."
        if guardrail_hit:
            message = "Your Plus monthly AI cost guardrail was reached. Upgrade to Max for unlimited usage."
        raise HTTPException(
            status_code=402,
            detail={
                "message": message,
                "resets_at": status.get('resets_at')
            }
        )


# ============ Auth Helper Functions ============
def create_access_token(user_id: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION)
    to_encode = {"sub": user_id, "username": username, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def _ensure_producer_profile(user_id: str, username: str) -> None:
    """Auto-enroll user into Producer Spotlight profile table if missing."""
    existing = await db.producer_profiles.find_one({"user_id": user_id})
    if existing:
        return
    now = datetime.now(timezone.utc)
    profile = ProducerProfile(
        user_id=user_id,
        username=username or "producer",
        created_at=now,
        updated_at=now,
    )
    await db.producer_profiles.insert_one(profile.model_dump())


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


def _is_admin_user(user: dict) -> bool:
    user_id = str(user.get("id") or "").strip()
    username = str(user.get("username") or "").strip().lower()
    return (user_id and user_id in ADMIN_USER_IDS) or (username and username in ADMIN_USERNAMES)


async def _ensure_pro_user(current_user: dict, feature_name: str = "This feature") -> None:
    sub_status = await get_user_subscription_status(current_user["id"])
    if not sub_status.get("is_subscribed"):
        raise HTTPException(
            status_code=402,
            detail=f"{feature_name} is a Pro feature. Upgrade to Pro to use BeatHelper."
        )


def _safe_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _estimate_best_upload_hour_utc(user_id: str) -> int:
    """
    Estimate best publish hour from the user's recent YouTube uploads.
    Falls back to 18 UTC if unavailable.
    """
    try:
        credentials = await refresh_youtube_token(user_id)
        youtube = build("youtube", "v3", credentials=credentials)
        search_response = youtube.search().list(
            part="id",
            forMine=True,
            type="video",
            order="date",
            maxResults=25
        ).execute()
        video_ids = [item["id"]["videoId"] for item in search_response.get("items", []) if item.get("id", {}).get("videoId")]
        if not video_ids:
            return 18

        videos_response = youtube.videos().list(
            part="snippet,statistics",
            id=",".join(video_ids)
        ).execute()

        buckets: dict[int, float] = {}
        for item in videos_response.get("items", []):
            published_at = (item.get("snippet", {}) or {}).get("publishedAt", "")
            if not published_at:
                continue
            dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            hour = dt.hour
            views = float((item.get("statistics", {}) or {}).get("viewCount", 0) or 0)
            buckets[hour] = buckets.get(hour, 0.0) + max(1.0, views)

        if not buckets:
            return 18
        return max(buckets.items(), key=lambda pair: pair[1])[0]
    except Exception:
        return 18


async def _generate_beathelper_metadata(
    *,
    target_artist: str,
    beat_type: str,
    context_tags: list[str],
    user_id: str,
) -> dict:
    prompt = (
        "Generate metadata for a YouTube type beat upload.\n"
        f"Target artist: {target_artist}\n"
        f"Beat type/style: {beat_type}\n"
        f"Extra context tags: {', '.join(context_tags[:25]) if context_tags else 'none'}\n\n"
        "Return strict JSON with keys: title, tags, description.\n"
        "- title: <= 100 chars, high-intent SEO, no BPM, no key.\n"
        "- tags: array of 25-40 concise tags, no duplicates, high intent only.\n"
        "- description: concise producer-focused upload description with CTA, no BPM/key/prices.\n"
    )

    fallback_title = f"{target_artist} Type Beat - {beat_type.title()} Instrumental"
    fallback_tags = [
        f"{target_artist} type beat",
        f"{target_artist} instrumental",
        f"{target_artist} type beat instrumental",
        f"{beat_type} type beat",
        f"{beat_type} instrumental",
    ] + [tag for tag in context_tags if isinstance(tag, str) and tag.strip()]
    fallback_desc = (
        f"{target_artist} type beat in a {beat_type} style.\n"
        "If you want more beats like this, subscribe and drop a comment with the next artist/style."
    )

    try:
        response_text = await llm_chat(
            system_message="You are an expert YouTube SEO producer assistant. Output JSON only.",
            user_message=prompt,
            temperature=0.35,
            user_id=user_id,
        )
        payload = _parse_llm_json_response(response_text)
        title = str(payload.get("title") or "").strip() or fallback_title
        tags_raw = payload.get("tags") or []
        if not isinstance(tags_raw, list):
            tags_raw = []
        seen = set()
        tags: list[str] = []
        for tag in tags_raw + fallback_tags:
            cleaned = re.sub(r"\s+", " ", str(tag or "").strip())
            if not cleaned:
                continue
            key = cleaned.lower()
            if key in seen:
                continue
            seen.add(key)
            tags.append(cleaned)
            if len(tags) >= 40:
                break
        description = str(payload.get("description") or "").strip() or fallback_desc
        return {"title": title[:100], "tags": tags, "description": description}
    except Exception:
        return {"title": fallback_title[:100], "tags": fallback_tags[:40], "description": fallback_desc}


def _build_beathelper_approval_message(item: dict) -> str:
    artist = item.get("target_artist", "artist")
    title = item.get("generated_title") or item.get("beat_original_filename") or "your next beat"
    return (
        f"BeatHelper wants to upload: '{title}'.\n"
        f"Style target: {artist}\n"
        f"Tags: {', '.join((item.get('generated_tags') or [])[:8])}\n"
        f"Template: {(item.get('template_name') or 'default')}\n"
        "Reply in dashboard: Approve, Skip, or Choose another beat."
    )


def _normalize_tag_list(raw_tags: list[str] | None, limit: int = 40) -> list[str]:
    tags = raw_tags or []
    cleaned: list[str] = []
    seen = set()
    for tag in tags:
        value = re.sub(r"\s+", " ", str(tag or "").strip())
        if not value:
            continue
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(value)
        if len(cleaned) >= limit:
            break
    return cleaned


def _send_email_notification(to_email: str, subject: str, message: str) -> bool:
    if not SENDGRID_API_KEY or not SENDGRID_FROM_EMAIL or not to_email:
        return False
    try:
        resp = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": SENDGRID_FROM_EMAIL},
                "subject": subject,
                "content": [{"type": "text/plain", "value": message}],
            },
            timeout=12,
        )
        return resp.status_code < 400
    except Exception:
        return False


def _send_sms_notification(to_phone: str, message: str) -> bool:
    if not TEXTBELT_API_KEY or not to_phone:
        return False
    try:
        resp = requests.post(
            "https://textbelt.com/text",
            data={"phone": to_phone, "message": message, "key": TEXTBELT_API_KEY},
            timeout=12,
        )
        return resp.status_code < 400
    except Exception:
        return False


async def _dispatch_beathelper_approval_request(item: dict, user_doc: dict, source: str = "manual") -> dict:
    user_id = (user_doc or {}).get("id")
    if not user_id:
        return {"success": False, "status": "failed", "detail": "Missing user id"}

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=max(1, int(item.get("approval_timeout_hours", BEATHELPER_DEFAULT_APPROVAL_TIMEOUT_HOURS))))
    subject = "BeatHelper approval request"
    message = _build_beathelper_approval_message(item)

    email = (user_doc or {}).get("email") or ""
    phone = (user_doc or {}).get("phone") or ""
    notify_channel = (item.get("notify_channel") or "none").lower()

    email_sent = False
    sms_sent = False
    if notify_channel in {"email", "email_sms"}:
        email_sent = _send_email_notification(email, subject, message)
    if notify_channel in {"sms", "email_sms"}:
        sms_sent = _send_sms_notification(phone, message)

    if notify_channel == "none":
        notification_status = "none"
    else:
        notification_status = "sent" if (email_sent or sms_sent) else "failed"

    await db.beat_helper_queue.update_one(
        {"id": item["id"], "user_id": user_id},
        {"$set": {
            "status": "pending_approval",
            "approval_requested_at": now.isoformat(),
            "approval_expires_at": expires_at.isoformat(),
            "last_notification_status": notification_status,
            "last_notification_source": source,
            "updated_at": _safe_iso_now(),
        }}
    )

    return {
        "success": True,
        "status": notification_status,
        "approval_expires_at": expires_at.isoformat(),
    }


async def _process_expired_beathelper_pending_items() -> dict:
    now = datetime.now(timezone.utc)
    pending_items = await db.beat_helper_queue.find(
        {"status": "pending_approval"},
        {"_id": 0}
    ).to_list(2000)

    expired_count = 0
    auto_uploaded = 0
    for item in pending_items:
        expires_raw = (item.get("approval_expires_at") or "").strip()
        if not expires_raw:
            continue
        try:
            expires_at = datetime.fromisoformat(expires_raw.replace("Z", "+00:00"))
        except Exception:
            continue
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at > now:
            continue

        expired_count += 1
        if item.get("auto_upload_if_no_response"):
            try:
                user_doc = await db.users.find_one({"id": item.get("user_id")}, {"_id": 0, "id": 1, "username": 1})
                if user_doc:
                    await beathelper_approve_and_upload(
                        item_id=item["id"],
                        current_user={"id": user_doc["id"], "username": user_doc.get("username", "")},
                    )
                    auto_uploaded += 1
                    continue
            except Exception as e:
                logging.warning(f"BeatHelper auto-upload on expiry failed for {item.get('id')}: {str(e)}")

        await db.beat_helper_queue.update_one(
            {"id": item["id"], "user_id": item.get("user_id")},
            {"$set": {"status": "expired", "updated_at": _safe_iso_now()}}
        )

    return {"expired": expired_count, "auto_uploaded": auto_uploaded}


async def _dispatch_daily_beathelper_for_user(user_id: str, source: str = "daily_auto") -> dict:
    user_doc = await db.users.find_one(
        {"id": user_id},
        {
            "_id": 0,
            "id": 1,
            "username": 1,
            "email": 1,
            "phone": 1,
            "reminder_email_enabled": 1,
            "reminder_sms_enabled": 1,
            "beathelper_last_dispatch_date": 1,
            "beathelper_last_dispatch_at": 1,
            "beathelper_last_no_queue_reminder_date": 1,
            "beathelper_last_no_queue_reminder_at": 1,
        }
    )
    if not user_doc:
        return {"dispatched": False, "reason": "user_missing"}

    status = await get_user_subscription_status(user_id)
    if not status.get("is_subscribed"):
        return {"dispatched": False, "reason": "not_subscribed"}

    today = datetime.now(timezone.utc).date().isoformat()
    if source == "daily_auto" and (user_doc.get("beathelper_last_dispatch_date") or "") == today:
        return {"dispatched": False, "reason": "already_dispatched_today"}

    queued_items = await db.beat_helper_queue.find(
        {"user_id": user_id, "status": "queued"},
        {"_id": 0}
    ).to_list(500)
    if not queued_items:
        reminder_subject = "BeatHelper queue is empty"
        reminder_message = (
            f"Hey @{user_doc.get('username') or 'producer'}, your BeatHelper queue is empty today.\n\n"
            "Add new beats so BeatHelper can send you daily upload approvals.\n"
            f"Open dashboard: {FRONTEND_URL}/dashboard"
        )
        sms_message = (
            f"BeatHelper: no beats queued today. Add beats here: {FRONTEND_URL}/dashboard"
        )

        email_enabled = bool(user_doc.get("reminder_email_enabled"))
        sms_enabled = bool(user_doc.get("reminder_sms_enabled"))
        email = (user_doc.get("email") or "").strip()
        phone = (user_doc.get("phone") or "").strip()

        email_sent = False
        sms_sent = False
        if email_enabled and email:
            email_sent = _send_email_notification(email, reminder_subject, reminder_message)
        if sms_enabled and phone:
            sms_sent = _send_sms_notification(phone, sms_message)

        if source == "daily_auto":
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "beathelper_last_dispatch_date": today,
                    "beathelper_last_dispatch_at": _safe_iso_now(),
                    "beathelper_last_no_queue_reminder_date": today,
                    "beathelper_last_no_queue_reminder_at": _safe_iso_now(),
                }}
            )

        reminder_status = "none"
        if email_enabled or sms_enabled:
            reminder_status = "sent" if (email_sent or sms_sent) else "failed"
        return {
            "dispatched": False,
            "reason": "no_queued_items",
            "reminder_status": reminder_status,
            "email_enabled": email_enabled,
            "sms_enabled": sms_enabled,
            "email_sent": email_sent,
            "sms_sent": sms_sent,
        }

    chosen = random.choice(queued_items)
    result = await _dispatch_beathelper_approval_request(chosen, user_doc, source=source)
    if source == "daily_auto":
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "beathelper_last_dispatch_date": today,
                "beathelper_last_dispatch_at": _safe_iso_now(),
            }}
        )
    return {"dispatched": True, "item_id": chosen.get("id"), **result}


async def _run_beathelper_daily_scheduler_once() -> dict:
    expired_result = await _process_expired_beathelper_pending_items()
    user_ids = await db.beat_helper_queue.distinct("user_id", {"status": "queued"})
    dispatched = 0
    for user_id in user_ids:
        try:
            result = await _dispatch_daily_beathelper_for_user(user_id, source="daily_auto")
            if result.get("dispatched"):
                dispatched += 1
        except Exception as e:
            logging.warning(f"BeatHelper daily dispatch failed for user {user_id}: {str(e)}")
    return {"users_dispatched": dispatched, **expired_result}


async def _beathelper_scheduler_loop():
    while True:
        try:
            result = await _run_beathelper_daily_scheduler_once()
            if result.get("users_dispatched") or result.get("expired"):
                logging.info(f"BeatHelper scheduler tick: {result}")
        except Exception as e:
            logging.error(f"BeatHelper scheduler loop error: {str(e)}")
        await asyncio.sleep(max(60, BEATHELPER_SCHEDULER_INTERVAL_SECONDS))


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
    await _ensure_producer_profile(user.id, user.username)
    
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
    await _ensure_producer_profile(user_doc['id'], user_doc['username'])
    
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
        resets_at=status.get('resets_at'),
        monthly_llm_cost_usd=status.get("monthly_llm_cost_usd"),
        cost_guardrail_hit=status.get("cost_guardrail_hit"),
    )

@api_router.post("/subscription/create-checkout")
async def create_checkout_session(request: CheckoutSessionRequest, current_user: dict = Depends(get_current_user)):
    """Create Stripe checkout session"""
    try:
        selected_plan = (request.plan or "plus").strip().lower()
        if selected_plan not in {"plus", "max"}:
            selected_plan = "plus"
        plus_price_id = os.environ.get("STRIPE_PRICE_ID_PLUS") or os.environ.get("STRIPE_PRICE_ID")
        max_price_id = os.environ.get("STRIPE_PRICE_ID_MAX")
        if selected_plan == "max" and not max_price_id:
            raise HTTPException(status_code=500, detail="Missing STRIPE_PRICE_ID_MAX")
        chosen_price_id = max_price_id if selected_plan == "max" else plus_price_id
        if not chosen_price_id:
            raise HTTPException(status_code=500, detail="Missing Stripe price configuration")

        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.get('email'),
            client_reference_id=current_user['id'],
            line_items=[{
                'price': chosen_price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata={
                'user_id': current_user['id'],
                'plan': selected_plan,
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
        plan = (session.get('metadata', {}).get('plan') or "plus").strip().lower()
        if plan not in {"plus", "max"}:
            plan = "plus"
        
        if user_id:
            # Activate subscription
            subscription_id = session.get('subscription')
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "stripe_customer_id": session.get('customer'),
                    "stripe_subscription_id": subscription_id,
                    "subscription_status": "active",
                    "subscription_plan": plan,
                    "subscribed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logging.info(f"Subscription activated for user {user_id}")
    
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        customer_id = subscription['customer']
        items = (((subscription.get("items") or {}).get("data")) or [])
        active_price_ids = {((it.get("price") or {}).get("id") or "").strip() for it in items}
        plus_price_id = os.environ.get("STRIPE_PRICE_ID_PLUS") or os.environ.get("STRIPE_PRICE_ID", "")
        max_price_id = os.environ.get("STRIPE_PRICE_ID_MAX", "")
        plan = "plus"
        if max_price_id and max_price_id in active_price_ids:
            plan = "max"
        elif plus_price_id and plus_price_id in active_price_ids:
            plan = "plus"
        
        # Find user by customer ID
        user_doc = await db.users.find_one({"stripe_customer_id": customer_id})
        if user_doc:
            await db.users.update_one(
                {"id": user_doc['id']},
                {"$set": {
                    "subscription_status": subscription['status'],
                    "subscription_plan": plan,
                }}
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
                    "stripe_subscription_id": None,
                    "subscription_plan": "free",
                }}
            )
    
    return {"status": "success"}

@api_router.get("/subscription/config")
async def get_subscription_config():
    """Get Stripe configuration for frontend"""
    return {
        "publishable_key": os.environ.get('STRIPE_PUBLISHABLE_KEY'),
        "price_id_plus": os.environ.get("STRIPE_PRICE_ID_PLUS") or os.environ.get("STRIPE_PRICE_ID"),
        "price_id_max": os.environ.get("STRIPE_PRICE_ID_MAX"),
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


# ============ BeatHelper Routes (Pro) ============
@api_router.get("/beat-helper/uploads")
async def beathelper_get_uploads(current_user: dict = Depends(get_current_user)):
    await _ensure_pro_user(current_user, "BeatHelper")
    uploads = await db.uploads.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "id": 1, "original_filename": 1, "file_type": 1, "uploaded_at": 1}
    ).sort("uploaded_at", -1).to_list(500)
    audio = [item for item in uploads if item.get("file_type") == "audio"]
    images = [item for item in uploads if item.get("file_type") == "image"]
    return {"audio_uploads": audio, "image_uploads": images}


@api_router.get("/beat-helper/image/{file_id}/preview")
async def beathelper_get_image_preview(file_id: str, current_user: dict = Depends(get_current_user)):
    await _ensure_pro_user(current_user, "BeatHelper")
    upload = await db.uploads.find_one({
        "id": file_id.strip(),
        "user_id": current_user["id"],
        "file_type": "image",
    })
    if not upload:
        raise HTTPException(status_code=404, detail="Image not found.")

    path = Path(upload.get("file_path", ""))
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image file missing on server.")

    image_bytes = path.read_bytes()
    ext = path.suffix.lower()
    mime = "image/jpeg"
    if ext == ".png":
        mime = "image/png"
    elif ext == ".webp":
        mime = "image/webp"
    elif ext == ".webm":
        mime = "image/webm"

    data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
    return {"file_id": upload.get("id"), "filename": upload.get("original_filename"), "data_url": data_url}


@api_router.get("/beat-helper/queue")
async def beathelper_get_queue(current_user: dict = Depends(get_current_user)):
    await _ensure_pro_user(current_user, "BeatHelper")
    items = await db.beat_helper_queue.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return items


@api_router.get("/beat-helper/contact-settings")
async def beathelper_get_contact_settings(current_user: dict = Depends(get_current_user)):
    await _ensure_pro_user(current_user, "BeatHelper")
    user_doc = await db.users.find_one(
        {"id": current_user["id"]},
        {"_id": 0, "email": 1, "phone": 1, "reminder_email_enabled": 1, "reminder_sms_enabled": 1}
    )
    return {
        "email": (user_doc or {}).get("email") or "",
        "phone": (user_doc or {}).get("phone") or "",
        "email_enabled": bool((user_doc or {}).get("reminder_email_enabled")),
        "sms_enabled": bool((user_doc or {}).get("reminder_sms_enabled")),
    }


@api_router.put("/beat-helper/contact-settings")
async def beathelper_update_contact_settings(
    request: BeatHelperContactSettingsRequest,
    current_user: dict = Depends(get_current_user),
):
    await _ensure_pro_user(current_user, "BeatHelper")
    email = (request.email or "").strip()
    phone = re.sub(r"\s+", "", (request.phone or "").strip())
    if email and "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email format.")
    if phone and not re.match(r"^\+?[0-9]{7,15}$", phone):
        raise HTTPException(status_code=400, detail="Invalid phone format. Use digits with optional leading +.")

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "email": email or None,
            "phone": phone or None,
            "reminder_email_enabled": bool(request.email_enabled),
            "reminder_sms_enabled": bool(request.sms_enabled),
        }}
    )

    username = (current_user.get("username") or "producer").strip()
    confirmation_subject = "BeatHelper notifications enabled"
    confirmation_message = (
        f"Hey {username}, BeatHelper notifications are now enabled for your account.\n\n"
        "You will receive beat queue updates on this channel based on your selected settings.\n"
        "If this was not you, update your notification settings in dashboard immediately."
    )
    sms_message = (
        f"BeatHelper: Notifications enabled for @{username}. "
        "You will receive beat queue updates on this number."
    )

    email_confirmation_sent = False
    sms_confirmation_sent = False
    if request.email_enabled and email:
        email_confirmation_sent = _send_email_notification(email, confirmation_subject, confirmation_message)
    if request.sms_enabled and phone:
        sms_confirmation_sent = _send_sms_notification(phone, sms_message)

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "beathelper_contact_confirmation_sent_at": _safe_iso_now(),
            "beathelper_contact_confirmation_status": {
                "email_enabled": bool(request.email_enabled),
                "sms_enabled": bool(request.sms_enabled),
                "email_confirmation_sent": bool(email_confirmation_sent),
                "sms_confirmation_sent": bool(sms_confirmation_sent),
            },
        }}
    )

    return {
        "success": True,
        "confirmation": {
            "email_enabled": bool(request.email_enabled),
            "sms_enabled": bool(request.sms_enabled),
            "email_confirmation_sent": bool(email_confirmation_sent),
            "sms_confirmation_sent": bool(sms_confirmation_sent),
        }
    }


@api_router.get("/beat-helper/tag-templates")
async def beathelper_get_tag_templates(current_user: dict = Depends(get_current_user)):
    await _ensure_pro_user(current_user, "BeatHelper")
    templates = await db.beat_helper_tag_templates.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    return templates


@api_router.post("/beat-helper/tag-templates")
async def beathelper_create_tag_template(
    request: BeatHelperTagTemplateCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    await _ensure_pro_user(current_user, "BeatHelper")
    name = (request.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Template name is required.")
    tags = _normalize_tag_list(request.tags, limit=80)
    template = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "name": name[:80],
        "tags": tags,
        "created_at": _safe_iso_now(),
        "updated_at": _safe_iso_now(),
    }
    await db.beat_helper_tag_templates.insert_one(template)
    return template


@api_router.patch("/beat-helper/tag-templates/{template_id}")
async def beathelper_update_tag_template(
    template_id: str,
    request: BeatHelperTagTemplateUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    await _ensure_pro_user(current_user, "BeatHelper")
    updates: dict = {"updated_at": _safe_iso_now()}
    if request.name is not None:
        name = request.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Template name cannot be empty.")
        updates["name"] = name[:80]
    if request.tags is not None:
        updates["tags"] = _normalize_tag_list(request.tags, limit=80)

    result = await db.beat_helper_tag_templates.update_one(
        {"id": template_id, "user_id": current_user["id"]},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found.")
    return {"success": True}


@api_router.delete("/beat-helper/tag-templates/{template_id}")
async def beathelper_delete_tag_template(template_id: str, current_user: dict = Depends(get_current_user)):
    await _ensure_pro_user(current_user, "BeatHelper")
    result = await db.beat_helper_tag_templates.delete_one({"id": template_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found.")
    return {"success": True}


@api_router.post("/beat-helper/assist-title")
async def beathelper_assist_title(
    request: BeatHelperAssistTitleRequest,
    current_user: dict = Depends(get_current_user),
):
    await _ensure_pro_user(current_user, "BeatHelper")
    target_artist = request.target_artist.strip()
    beat_type = request.beat_type.strip()
    if not target_artist or not beat_type:
        raise HTTPException(status_code=400, detail="target_artist and beat_type are required.")

    current_title = (request.current_title or "").strip()
    prompt = (
        "Generate 5 high-converting YouTube type beat titles.\n"
        f"Artist: {target_artist}\n"
        f"Beat Type: {beat_type}\n"
        f"Current title: {current_title or 'none'}\n"
        f"Context tags: {', '.join(request.context_tags[:20]) if request.context_tags else 'none'}\n"
        "Rules: no BPM, no key, <= 100 chars each, plain text.\n"
        "Return JSON: {\"titles\": [\"...\", \"...\", ...]}"
    )
    try:
        raw = await llm_chat(
            system_message="You are a YouTube SEO assistant for producers. Output JSON only.",
            user_message=prompt,
            temperature=0.5,
            user_id=current_user["id"],
        )
        parsed = _parse_llm_json_response(raw)
        titles = parsed.get("titles") if isinstance(parsed.get("titles"), list) else []
        cleaned = []
        seen = set()
        for title in titles:
            value = re.sub(r"\s+", " ", str(title or "").strip())
            if not value:
                continue
            key = value.lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(value[:100])
            if len(cleaned) >= 5:
                break
        if not cleaned:
            cleaned = [f"{target_artist} Type Beat - {beat_type.title()} Instrumental"]
        return {"titles": cleaned}
    except Exception:
        return {"titles": [f"{target_artist} Type Beat - {beat_type.title()} Instrumental"]}


@api_router.post("/beat-helper/queue")
async def beathelper_create_queue_item(
    request: BeatHelperQueueCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        await _ensure_pro_user(current_user, "BeatHelper")

        if not request.beat_file_id.strip():
            raise HTTPException(status_code=400, detail="beat_file_id is required.")
        if not request.target_artist.strip() or not request.beat_type.strip():
            raise HTTPException(status_code=400, detail="target_artist and beat_type are required.")

        beat_file = await db.uploads.find_one({
            "id": request.beat_file_id,
            "user_id": current_user["id"],
            "file_type": "audio",
        })
        if not beat_file:
            raise HTTPException(status_code=404, detail="Beat audio file not found.")

        image_file_id = (request.image_file_id or "").strip()
        image_file = None
        if image_file_id:
            image_file = await db.uploads.find_one({
                "id": image_file_id,
                "user_id": current_user["id"],
                "file_type": "image",
            })
            if not image_file:
                raise HTTPException(status_code=404, detail="Selected thumbnail image not found.")

        if not image_file and request.ai_choose_image:
            ai_query = f"{request.target_artist} type beat {request.beat_type}".strip()
            image_suggestions = await generate_image_suggestions(
                ImageGenerateRequest(title=ai_query, tags=request.context_tags or [], k=1),
                current_user,
            )
            if image_suggestions.results:
                chosen = image_suggestions.results[0]
                imported = await upload_image_from_url(
                    UploadImageFromUrlRequest(
                        image_url=chosen.image_url,
                        original_filename=f"{request.target_artist}-ai-thumb.jpg",
                    ),
                    current_user,
                )
                image_file_id = imported.get("file_id")
                image_file = await db.uploads.find_one({
                    "id": image_file_id,
                    "user_id": current_user["id"],
                    "file_type": "image",
                })

        if not image_file:
            raise HTTPException(
                status_code=400,
                detail="A thumbnail is required. Pick one manually or enable AI image selection."
            )

        duplicate_beat = await db.beat_helper_queue.find_one({
            "user_id": current_user["id"],
            "status": {"$in": ["queued", "pending_approval", "approved"]},
            "beat_file_id": request.beat_file_id,
        })
        if duplicate_beat:
            raise HTTPException(status_code=409, detail="This beat is already queued.")

        duplicate_image = await db.beat_helper_queue.find_one({
            "user_id": current_user["id"],
            "status": {"$in": ["queued", "pending_approval", "approved"]},
            "image_file_id": image_file.get("id"),
        })
        if duplicate_image:
            raise HTTPException(status_code=409, detail="This thumbnail is already used in another active queue item.")

        approval_timeout_hours = max(1, min(72, int(request.approval_timeout_hours or BEATHELPER_DEFAULT_APPROVAL_TIMEOUT_HOURS)))
        notify_channel = (request.notify_channel or BEATHELPER_DEFAULT_NOTIFY_CHANNEL or "email").strip().lower()
        if notify_channel not in {"none", "email", "sms", "email_sms"}:
            notify_channel = "email"

        metadata = await _generate_beathelper_metadata(
            target_artist=request.target_artist,
            beat_type=request.beat_type,
            context_tags=request.context_tags or [],
            user_id=current_user["id"],
        )
        template_id = (request.template_id or "").strip()
        template_doc = None
        if template_id:
            template_doc = await db.beat_helper_tag_templates.find_one(
                {"id": template_id, "user_id": current_user["id"]},
                {"_id": 0}
            )
            if template_doc:
                metadata["tags"] = _normalize_tag_list((template_doc.get("tags") or []) + (metadata.get("tags") or []))

        description_id = str(uuid.uuid4())
        description_doc = {
            "id": description_id,
            "user_id": current_user["id"],
            "title": f"BeatHelper - {metadata['title'][:80]}",
            "content": metadata["description"],
            "is_ai_generated": True,
            "created_at": _safe_iso_now(),
            "updated_at": _safe_iso_now(),
        }
        await db.descriptions.insert_one(description_doc)

        tags_id = str(uuid.uuid4())
        tags_doc = {
            "id": tags_id,
            "user_id": current_user["id"],
            "query": f"{request.target_artist} {request.beat_type}".strip(),
            "tags": metadata["tags"],
            "created_at": _safe_iso_now(),
        }
        await db.tag_generations.insert_one(tags_doc)

        best_hour_utc = await _estimate_best_upload_hour_utc(current_user["id"])
        now_utc = datetime.now(timezone.utc)
        scheduled_for = now_utc.replace(hour=best_hour_utc, minute=0, second=0, microsecond=0)
        if scheduled_for <= now_utc:
            scheduled_for = scheduled_for + timedelta(days=1)

        item_id = str(uuid.uuid4())
        queue_doc = {
            "id": item_id,
            "user_id": current_user["id"],
            "status": "queued",
            "beat_file_id": request.beat_file_id,
            "beat_original_filename": beat_file.get("original_filename"),
            "image_file_id": image_file.get("id"),
            "image_original_filename": image_file.get("original_filename"),
            "target_artist": request.target_artist.strip(),
            "beat_type": request.beat_type.strip(),
            "context_tags": request.context_tags or [],
            "ai_choose_image": bool(request.ai_choose_image),
            "approval_timeout_hours": approval_timeout_hours,
            "auto_upload_if_no_response": bool(request.auto_upload_if_no_response),
            "notify_channel": notify_channel,
            "privacy_status": request.privacy_status,
            "best_upload_hour_utc": int(best_hour_utc),
            "scheduled_for_utc": scheduled_for.isoformat(),
            "generated_title": metadata["title"],
            "generated_tags": metadata["tags"],
            "generated_description": metadata["description"],
            "template_id": template_id or None,
            "template_name": (template_doc or {}).get("name"),
            "description_id": description_id,
            "tags_id": tags_id,
            "created_at": _safe_iso_now(),
            "updated_at": _safe_iso_now(),
            "approval_requested_at": None,
            "approval_expires_at": None,
            "last_notification_status": "none",
        }

        override_title = (request.generated_title_override or "").strip()
        if override_title:
            queue_doc["generated_title"] = override_title[:100]
            description_doc["title"] = f"BeatHelper - {override_title[:80]}"
            await db.descriptions.update_one(
                {"id": description_id, "user_id": current_user["id"]},
                {"$set": {"title": description_doc["title"], "updated_at": _safe_iso_now()}},
            )

        await db.beat_helper_queue.insert_one(queue_doc)
        return queue_doc
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"beathelper_create_queue_item error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to queue beat: {str(e)}")


@api_router.post("/beat-helper/queue/{item_id}/request-approval")
async def beathelper_request_approval(item_id: str, current_user: dict = Depends(get_current_user)):
    await _ensure_pro_user(current_user, "BeatHelper")
    item = await db.beat_helper_queue.find_one({"id": item_id, "user_id": current_user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found.")
    user_doc = await db.users.find_one(
        {"id": current_user["id"]},
        {"_id": 0, "id": 1, "username": 1, "email": 1, "phone": 1}
    ) or {"id": current_user["id"], "username": current_user.get("username", "")}
    dispatch_result = await _dispatch_beathelper_approval_request(item, user_doc, source="manual")

    return {
        "success": True,
        "status": dispatch_result.get("status", "failed"),
        "approval_expires_at": dispatch_result.get("approval_expires_at"),
        "message": "Approval request sent. Beat will not upload until approved unless auto-upload is enabled.",
    }


@api_router.post("/beat-helper/dispatch-daily-now")
async def beathelper_dispatch_daily_now(current_user: dict = Depends(get_current_user)):
    """Manual trigger so user can test SMS/email dispatch immediately."""
    await _ensure_pro_user(current_user, "BeatHelper")
    result = await _dispatch_daily_beathelper_for_user(current_user["id"], source="manual_test")
    if not result.get("dispatched"):
        return {"success": False, **result}
    return {"success": True, **result}


@api_router.post("/beat-helper/queue/{item_id}/approve-upload")
async def beathelper_approve_and_upload(item_id: str, current_user: dict = Depends(get_current_user)):
    await _ensure_pro_user(current_user, "BeatHelper")
    item = await db.beat_helper_queue.find_one({"id": item_id, "user_id": current_user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found.")

    if item.get("status") == "uploaded":
        return {"success": True, "message": "Already uploaded.", "video_url": item.get("video_url")}

    upload_result = await upload_to_youtube(
        title=item.get("generated_title") or item.get("beat_original_filename") or "Beat upload",
        description_id=item.get("description_id"),
        tags_id=item.get("tags_id"),
        privacy_status=item.get("privacy_status", "public"),
        audio_file_id=item.get("beat_file_id"),
        image_file_id=item.get("image_file_id"),
        description_override=item.get("generated_description"),
        aspect_ratio="16:9",
        image_scale=1.0,
        image_scale_x=None,
        image_scale_y=None,
        image_pos_x=0.0,
        image_pos_y=0.0,
        image_rotation=0.0,
        background_color="black",
        remove_watermark=True,
        current_user=current_user,
    )

    await db.beat_helper_queue.update_one(
        {"id": item_id, "user_id": current_user["id"]},
        {"$set": {
            "status": "uploaded",
            "uploaded_at": _safe_iso_now(),
            "video_id": upload_result.get("video_id"),
            "video_url": upload_result.get("video_url"),
            "updated_at": _safe_iso_now(),
        }}
    )
    return {"success": True, **upload_result}


@api_router.patch("/beat-helper/queue/{item_id}")
async def beathelper_update_queue_item(
    item_id: str,
    request: BeatHelperQueueUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    await _ensure_pro_user(current_user, "BeatHelper")
    result = await db.beat_helper_queue.update_one(
        {"id": item_id, "user_id": current_user["id"]},
        {"$set": {"status": request.status, "updated_at": _safe_iso_now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Queue item not found.")
    return {"success": True}


@api_router.post("/beat-helper/queue/{item_id}/respond")
async def beathelper_respond_to_request(
    item_id: str,
    request: BeatHelperUserResponseRequest,
    current_user: dict = Depends(get_current_user),
):
    await _ensure_pro_user(current_user, "BeatHelper")
    if request.action == "approve":
        return await beathelper_approve_and_upload(item_id=item_id, current_user=current_user)
    if request.action == "skip":
        await db.beat_helper_queue.update_one(
            {"id": item_id, "user_id": current_user["id"]},
            {"$set": {"status": "skipped", "updated_at": _safe_iso_now()}},
        )
        return {"success": True, "status": "skipped"}

    # change
    patch_payload = BeatHelperQueueEditRequest(
        generated_title=request.generated_title,
        target_artist=request.target_artist,
        beat_type=request.beat_type,
        beat_file_id=request.beat_file_id,
        image_file_id=request.image_file_id,
    )
    return await beathelper_edit_queue_item(
        item_id=item_id,
        request=patch_payload,
        current_user=current_user,
    )


@api_router.patch("/beat-helper/queue/{item_id}/edit")
async def beathelper_edit_queue_item(
    item_id: str,
    request: BeatHelperQueueEditRequest,
    current_user: dict = Depends(get_current_user),
):
    await _ensure_pro_user(current_user, "BeatHelper")
    item = await db.beat_helper_queue.find_one({"id": item_id, "user_id": current_user["id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found.")

    updates: dict[str, Any] = {"updated_at": _safe_iso_now()}

    if request.beat_file_id:
        beat_doc = await db.uploads.find_one({
            "id": request.beat_file_id,
            "user_id": current_user["id"],
            "file_type": "audio",
        })
        if not beat_doc:
            raise HTTPException(status_code=404, detail="Selected beat audio not found.")
        duplicate_beat = await db.beat_helper_queue.find_one({
            "id": {"$ne": item_id},
            "user_id": current_user["id"],
            "status": {"$in": ["queued", "pending_approval", "approved"]},
            "beat_file_id": request.beat_file_id,
        })
        if duplicate_beat:
            raise HTTPException(status_code=409, detail="This beat is already queued elsewhere.")
        updates["beat_file_id"] = request.beat_file_id
        updates["beat_original_filename"] = beat_doc.get("original_filename")

    if request.image_file_id:
        image_doc = await db.uploads.find_one({
            "id": request.image_file_id,
            "user_id": current_user["id"],
            "file_type": "image",
        })
        if not image_doc:
            raise HTTPException(status_code=404, detail="Selected image not found.")
        duplicate_image = await db.beat_helper_queue.find_one({
            "id": {"$ne": item_id},
            "user_id": current_user["id"],
            "status": {"$in": ["queued", "pending_approval", "approved"]},
            "image_file_id": request.image_file_id,
        })
        if duplicate_image:
            raise HTTPException(status_code=409, detail="This thumbnail is already used in another active queue item.")
        updates["image_file_id"] = request.image_file_id
        updates["image_original_filename"] = image_doc.get("original_filename")

    if request.generated_title is not None:
        title = request.generated_title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Title cannot be empty.")
        updates["generated_title"] = title[:100]

    if request.target_artist is not None:
        artist = request.target_artist.strip()
        if not artist:
            raise HTTPException(status_code=400, detail="Artist cannot be empty.")
        updates["target_artist"] = artist

    if request.beat_type is not None:
        beat_type = request.beat_type.strip()
        if not beat_type:
            raise HTTPException(status_code=400, detail="Beat type cannot be empty.")
        updates["beat_type"] = beat_type

    if request.generated_description is not None:
        updates["generated_description"] = request.generated_description.strip()

    if request.generated_tags is not None:
        updates["generated_tags"] = _normalize_tag_list(request.generated_tags, limit=80)

    if request.context_tags is not None:
        updates["context_tags"] = _normalize_tag_list(request.context_tags, limit=50)

    if request.notify_channel is not None:
        updates["notify_channel"] = request.notify_channel

    if request.privacy_status is not None:
        updates["privacy_status"] = request.privacy_status

    if request.approval_timeout_hours is not None:
        updates["approval_timeout_hours"] = max(1, min(72, int(request.approval_timeout_hours)))

    if request.auto_upload_if_no_response is not None:
        updates["auto_upload_if_no_response"] = bool(request.auto_upload_if_no_response)

    if request.template_id is not None:
        template_id = (request.template_id or "").strip()
        if not template_id:
            updates["template_id"] = None
            updates["template_name"] = None
        else:
            template_doc = await db.beat_helper_tag_templates.find_one(
                {"id": template_id, "user_id": current_user["id"]},
                {"_id": 0}
            )
            if not template_doc:
                raise HTTPException(status_code=404, detail="Tag template not found.")
            updates["template_id"] = template_id
            updates["template_name"] = template_doc.get("name")
            if request.generated_tags is None:
                updates["generated_tags"] = _normalize_tag_list(
                    (template_doc.get("tags") or []) + (item.get("generated_tags") or []),
                    limit=80,
                )

    await db.beat_helper_queue.update_one(
        {"id": item_id, "user_id": current_user["id"]},
        {"$set": updates},
    )

    # Keep linked docs in sync for upload behavior.
    set_desc = {}
    if "generated_description" in updates:
        set_desc["content"] = updates["generated_description"]
    if "generated_title" in updates:
        set_desc["title"] = f"BeatHelper - {updates['generated_title'][:80]}"
    if set_desc:
        set_desc["updated_at"] = _safe_iso_now()
        await db.descriptions.update_one(
            {"id": item.get("description_id"), "user_id": current_user["id"]},
            {"$set": set_desc},
        )

    if "generated_tags" in updates:
        await db.tag_generations.update_one(
            {"id": item.get("tags_id"), "user_id": current_user["id"]},
            {"$set": {"tags": updates["generated_tags"]}},
        )

    refreshed = await db.beat_helper_queue.find_one({"id": item_id, "user_id": current_user["id"]}, {"_id": 0})
    return {"success": True, "item": refreshed}


@api_router.delete("/beat-helper/queue/{item_id}")
async def beathelper_delete_queue_item(item_id: str, current_user: dict = Depends(get_current_user)):
    await _ensure_pro_user(current_user, "BeatHelper")
    result = await db.beat_helper_queue.delete_one({"id": item_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Queue item not found.")
    return {"success": True}


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


def _attach_growth_to_profile(profile: ProducerProfile, growth_by_user: dict[str, dict]) -> ProducerProfile:
    growth = growth_by_user.get(profile.user_id, {}) if profile and profile.user_id else {}
    return profile.model_copy(update={
        "current_streak": int(growth.get("current_streak") or 0),
        "longest_streak": int(growth.get("longest_streak") or 0),
        "total_days_completed": int(growth.get("total_days_completed") or 0),
    })


def _extract_youtube_channel_hints(url: str) -> dict:
    raw = (url or "").strip()
    if not raw:
        return {}
    try:
        from urllib.parse import urlparse, parse_qs
        if not re.match(r"^https?://", raw, re.IGNORECASE):
            raw = f"https://{raw}"
        parsed = urlparse(raw)
        path = parsed.path or ""
        query = parse_qs(parsed.query or "")

        # /channel/UC...
        m_channel = re.search(r"/channel/(UC[\w-]{10,})", path, re.IGNORECASE)
        if m_channel:
            return {"channel_id": m_channel.group(1)}

        # /@handle
        m_handle = re.search(r"/@([A-Za-z0-9._-]+)", path)
        if m_handle:
            return {"handle": m_handle.group(1)}

        # /user/name or /c/name
        m_user = re.search(r"/(?:user|c)/([A-Za-z0-9._-]+)", path)
        if m_user:
            return {"legacy_name": m_user.group(1)}

        # video link with v=
        v = (query.get("v") or [None])[0]
        if v:
            return {"video_id": v}
    except Exception:
        return {}
    return {}


def _youtube_get_channel_id_from_hints(hints: dict, api_key: str) -> str | None:
    if not api_key:
        return None
    if hints.get("channel_id"):
        return hints["channel_id"]

    try:
        if hints.get("video_id"):
            r = requests.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={"part": "snippet", "id": hints["video_id"], "key": api_key},
                timeout=12,
            )
            if r.status_code < 400:
                items = r.json().get("items", [])
                if items:
                    return items[0].get("snippet", {}).get("channelId")

        search_term = hints.get("handle") or hints.get("legacy_name")
        if search_term:
            r = requests.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "type": "channel",
                    "q": search_term,
                    "maxResults": 1,
                    "key": api_key,
                },
                timeout=12,
            )
            if r.status_code < 400:
                items = r.json().get("items", [])
                if items:
                    return items[0].get("snippet", {}).get("channelId")
    except Exception:
        return None
    return None


def _fetch_channel_top_viewed_beats(youtube_url: str, top_k: int = 5) -> tuple[list[dict], dict]:
    api_key = os.environ.get("YOUTUBE_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return [], {}
    hints = _extract_youtube_channel_hints(youtube_url)
    channel_id = _youtube_get_channel_id_from_hints(hints, api_key)
    if not channel_id:
        return [], {}

    performance = {}
    try:
        ch = requests.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "statistics,snippet", "id": channel_id, "key": api_key},
            timeout=12,
        )
        if ch.status_code < 400:
            items = ch.json().get("items", [])
            if items:
                stats = items[0].get("statistics", {})
                performance = {
                    "subscriber_count": int(stats.get("subscriberCount", 0) or 0),
                    "total_views": int(stats.get("viewCount", 0) or 0),
                    "total_videos": int(stats.get("videoCount", 0) or 0),
                }
    except Exception:
        performance = {}

    try:
        s = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "channelId": channel_id,
                "type": "video",
                "maxResults": 25,
                "order": "viewCount",
                "key": api_key,
            },
            timeout=15,
        )
        if s.status_code >= 400:
            return [], performance
        items = s.json().get("items", [])
        video_ids = [i.get("id", {}).get("videoId") for i in items if i.get("id", {}).get("videoId")]
        if not video_ids:
            return [], performance

        v = requests.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={
                "part": "snippet,statistics",
                "id": ",".join(video_ids[:50]),
                "maxResults": 50,
                "key": api_key,
            },
            timeout=15,
        )
        if v.status_code >= 400:
            return [], performance

        beats = []
        for item in v.json().get("items", []):
            vid = item.get("id")
            sn = item.get("snippet", {})
            st = item.get("statistics", {})
            title = sn.get("title") or "Untitled"
            beats.append({
                "title": title,
                "url": f"https://www.youtube.com/watch?v={vid}" if vid else None,
                "views": int(st.get("viewCount", 0) or 0),
                "likes": int(st.get("likeCount", 0) or 0),
                "published_at": sn.get("publishedAt"),
            })
        beats = sorted(beats, key=lambda b: b.get("views", 0), reverse=True)
        return beats[:max(1, top_k)], performance
    except Exception:
        return [], performance


@api_router.get("/producers/spotlight", response_model=SpotlightResponse)
async def get_producer_spotlight():
    """Get featured, trending, and new producers for the spotlight page"""
    all_profiles = await db.producer_profiles.find().to_list(5000)
    if not all_profiles:
        return SpotlightResponse(
            featured_producers=[],
            trending_producers=[],
            new_producers=[],
            all_producers=[],
        )

    growth_rows = await db.growth_streaks.find({}, {"_id": 0, "user_id": 1, "current_streak": 1, "total_days_completed": 1}).to_list(5000)
    growth_by_user = {g.get("user_id"): g for g in growth_rows}

    def trending_score(profile: dict) -> float:
        growth = growth_by_user.get(profile.get("user_id"), {})
        likes = float(profile.get("likes") or 0)
        views = float(profile.get("views") or 0)
        streak = float(growth.get("current_streak") or 0)
        days = float(growth.get("total_days_completed") or 0)
        # Networking signal: active streak + engagement.
        return likes * 4.0 + views * 0.15 + streak * 8.0 + days * 1.5

    featured = [p for p in all_profiles if p.get("featured")]
    featured = sorted(featured, key=trending_score, reverse=True)[:3]
    trending = sorted(all_profiles, key=trending_score, reverse=True)[:12]
    def created_at_ts(profile: dict) -> float:
        value = profile.get("created_at")
        if isinstance(value, datetime):
            return value.timestamp()
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value).timestamp()
            except Exception:
                return 0.0
        return 0.0

    new_producers = sorted(all_profiles, key=created_at_ts, reverse=True)[:12]

    featured_profiles = [_attach_growth_to_profile(await _profile_with_role_tag(p), growth_by_user) for p in featured]
    trending_profiles = [_attach_growth_to_profile(await _profile_with_role_tag(p), growth_by_user) for p in trending]
    new_profiles = [_attach_growth_to_profile(await _profile_with_role_tag(p), growth_by_user) for p in new_producers]
    all_network_profiles = [
        _attach_growth_to_profile(await _profile_with_role_tag(p), growth_by_user)
        for p in sorted(all_profiles, key=trending_score, reverse=True)
    ]

    return SpotlightResponse(
        featured_producers=featured_profiles,
        trending_producers=trending_profiles,
        new_producers=new_profiles,
        all_producers=all_network_profiles,
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


@api_router.get("/producers/{user_id}/stats")
async def get_producer_stats(user_id: str, current_user: dict = Depends(get_current_user)):
    """Detailed spotlight card stats for modal view."""
    profile = await db.producer_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Producer profile not found.")

    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "username": 1, "created_at": 1})
    growth = await db.growth_streaks.find_one({"user_id": user_id}, {"_id": 0})
    youtube = await db.youtube_connections.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "google_email": 1, "connected_at": 1})

    uploads = await db.uploads.find({"user_id": user_id}, {"_id": 0, "file_type": 1, "uploaded_at": 1}).to_list(2000)
    descriptions_count = await db.descriptions.count_documents({"user_id": user_id})
    tag_sets_count = await db.tag_history.count_documents({"user_id": user_id})

    audio_uploads = sum(1 for u in uploads if u.get("file_type") == "audio")
    image_uploads = sum(1 for u in uploads if u.get("file_type") == "image")

    profile_with_role = await _profile_with_role_tag(profile)
    top_beats = []
    if profile.get("top_beat_url"):
        top_beats.append({
            "title": "Top Beat",
            "url": profile.get("top_beat_url"),
        })

    recent_audio = await db.uploads.find(
        {"user_id": user_id, "file_type": "audio"},
        {"_id": 0, "original_filename": 1, "uploaded_at": 1}
    ).sort("uploaded_at", -1).limit(5).to_list(5)
    for idx, upload in enumerate(recent_audio):
        name = (upload.get("original_filename") or "").strip()
        if not name:
            continue
        top_beats.append({
            "title": f"Beat {idx + 1}: {name}",
            "url": None,
        })

    youtube_url = ((profile.get("social_links") or {}).get("youtube") or "").strip()
    channel_top_beats, channel_perf = await asyncio.to_thread(_fetch_channel_top_viewed_beats, youtube_url, 5)
    if channel_top_beats:
        # Prefer real channel top beats for spotlight.
        top_beats = channel_top_beats

    return {
        "profile": profile_with_role.model_dump(),
        "stats": {
            "likes": int(profile.get("likes") or 0),
            "views": int(profile.get("views") or 0),
            "current_streak": int((growth or {}).get("current_streak") or 0),
            "longest_streak": int((growth or {}).get("longest_streak") or 0),
            "total_days_completed": int((growth or {}).get("total_days_completed") or 0),
            "descriptions_created": int(descriptions_count),
            "tag_sets_created": int(tag_sets_count),
            "audio_uploads": int(audio_uploads),
            "image_uploads": int(image_uploads),
        },
        "top_beats": top_beats,
        "top_song": profile.get("top_beat_url"),
        "channel": {
            "connected": bool(youtube),
            "name": (youtube or {}).get("name"),
            "email": (youtube or {}).get("google_email"),
            "connected_at": (youtube or {}).get("connected_at"),
            "performance": channel_perf,
        },
        "channel_top_beats": channel_top_beats,
        "member_since": (user_doc or {}).get("created_at"),
    }

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
    if update_data.banner_url is not None:
        update_fields['banner_url'] = update_data.banner_url
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


@api_router.post("/producers/banner")
async def upload_producer_banner(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a profile banner and return a data URL that can be saved in profile."""
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid image type. Use JPG, PNG, or WEBP.")

    MAX_SIZE = 4 * 1024 * 1024
    image_bytes = await file.read(MAX_SIZE + 1)
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file.")
    if len(image_bytes) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Image too large. Max size is 4MB.")

    banner_data_url = f"data:{file.content_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
    await db.producer_profiles.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"banner_url": banner_data_url, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"banner_url": banner_data_url}


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
        query = artists[0] if artists else title
        if not query:
            raise HTTPException(status_code=400, detail="Could not infer artist query from title/tags.")

        query_variants: list[str] = []
        for a in artists:
            if a:
                query_variants.append(a)
                query_variants.append(f"{a} artist")
                query_variants.append(f"{a} rapper")
        if title:
            query_variants.append(title.strip())
        query_variants.append(query.strip())
        # Deduplicate while preserving order
        seen_q = set()
        query_variants = [q for q in query_variants if q and not (q.lower() in seen_q or seen_q.add(q.lower()))]

        results: list[dict] = []

        # 1) Pexels (preferred when key exists)
        pexels_key = os.environ.get("PEXELS_API_KEY")
        if pexels_key:
            try:
                for qv in query_variants[:3]:
                    if len(results) >= k:
                        break
                    pexels_resp = requests.get(
                        "https://api.pexels.com/v1/search",
                        params={"query": qv, "per_page": max(3, k), "orientation": "landscape"},
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
                                "query_used": qv,
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
                for qv in query_variants[:3]:
                    if len(results) >= k:
                        break
                    needed = k - len(results)
                    px_resp = requests.get(
                        "https://pixabay.com/api/",
                        params={
                            "key": os.environ.get("PIXABAY_API_KEY"),
                            "q": qv,
                            "image_type": "photo",
                            "per_page": max(3, needed),
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
                                "query_used": qv,
                                "source": "pixabay",
                                "credit_name": hit.get("user"),
                                "credit_url": f"https://pixabay.com/users/{hit.get('user', '')}/" if hit.get("user") else None,
                            })
            except Exception as e:
                logging.warning(f"Pixabay image search failed: {str(e)}")

        # 3) Deezer fallback (no key): artist photos
        if len(results) < k:
            try:
                for qv in query_variants[:4]:
                    if len(results) >= k:
                        break
                    needed = k - len(results)
                    dz_resp = requests.get(
                        "https://api.deezer.com/search/artist",
                        params={"q": qv},
                        timeout=10,
                    )
                    if dz_resp.status_code < 400:
                        payload = dz_resp.json()
                        for artist in payload.get("data", [])[:max(2, needed)]:
                            image_url = artist.get("picture_xl") or artist.get("picture_big") or artist.get("picture_medium")
                            if not image_url:
                                continue
                            results.append({
                                "id": f"deezer-{artist.get('id')}",
                                "image_url": image_url,
                                "thumbnail_url": artist.get("picture_medium") or image_url,
                                "artist": artist.get("name"),
                                "query_used": qv,
                                "source": "deezer",
                                "credit_name": artist.get("name"),
                                "credit_url": artist.get("link"),
                            })
            except Exception as e:
                logging.warning(f"Deezer image search failed: {str(e)}")

        # 4) iTunes fallback (no key): reliable for popular artists via album artwork
        if len(results) < k:
            try:
                for qv in query_variants[:4]:
                    if len(results) >= k:
                        break
                    needed = k - len(results)
                    it_resp = requests.get(
                        "https://itunes.apple.com/search",
                        params={"term": qv, "entity": "song", "limit": max(6, needed * 3)},
                        timeout=12,
                    )
                    if it_resp.status_code < 400:
                        payload = it_resp.json()
                        for item in payload.get("results", []):
                            image_url = item.get("artworkUrl100")
                            if not image_url:
                                continue
                            image_url = image_url.replace("100x100bb", "1200x1200bb")
                            thumb_url = item.get("artworkUrl100")
                            results.append({
                                "id": f"itunes-{item.get('trackId') or item.get('collectionId')}",
                                "image_url": image_url,
                                "thumbnail_url": thumb_url or image_url,
                                "artist": item.get("artistName"),
                                "query_used": qv,
                                "source": "itunes",
                                "credit_name": item.get("artistName"),
                                "credit_url": item.get("artistViewUrl") or item.get("trackViewUrl"),
                            })
            except Exception as e:
                logging.warning(f"iTunes image search failed: {str(e)}")

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
    if not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access only")

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
    per_user_stats = await db.usage_logs.aggregate([
        {"$match": {"timestamp": {"$gte": start_of_month}}},
        {"$group": {
            "_id": "$user_id",
            "total_cost": {"$sum": "$cost"},
            "requests": {"$sum": 1},
            "tokens_in": {"$sum": "$tokens_in"},
            "tokens_out": {"$sum": "$tokens_out"},
        }},
        {"$sort": {"total_cost": -1}},
        {"$limit": 25},
    ]).to_list(None)

    user_ids = [row.get("_id") for row in per_user_stats if row.get("_id") and row.get("_id") != "system"]
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "username": 1, "subscription_plan": 1, "subscription_status": 1}).to_list(None)
    users_by_id = {u["id"]: u for u in users}
    top_user_costs = []
    for row in per_user_stats:
        uid = row.get("_id")
        user_doc = users_by_id.get(uid, {})
        plan = _resolve_subscription_plan(user_doc) if user_doc else ("system" if uid == "system" else "free")
        cost = float(row.get("total_cost") or 0.0)
        estimated_revenue = 0.0
        if plan == "plus":
            estimated_revenue = PLUS_NET_REVENUE_USD
        elif plan == "max":
            estimated_revenue = 10.95  # rough net after stripe fees on $12
        top_user_costs.append({
            "user_id": uid,
            "username": user_doc.get("username"),
            "plan": plan,
            "requests": int(row.get("requests") or 0),
            "total_cost": round(cost, 4),
            "estimated_plan_revenue": round(estimated_revenue, 4),
            "estimated_margin": round(estimated_revenue - cost, 4),
            "unprofitable": bool(estimated_revenue > 0 and cost > estimated_revenue),
        })

    return {
        "month": now.strftime("%B %Y"),
        "hosting_cost": HOSTING_COST,
        "llm_cost": round(llm_total, 4),
        "total_estimated_cost": round(HOSTING_COST + llm_total, 4),
        "details": usage_stats,
        "top_user_costs": top_user_costs,
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

@app.on_event("startup")
async def startup_background_tasks():
    global _beathelper_scheduler_task
    if BEATHELPER_AUTO_DISPATCH_ENABLED and _beathelper_scheduler_task is None:
        _beathelper_scheduler_task = asyncio.create_task(_beathelper_scheduler_loop())
        logger.info("BeatHelper daily scheduler started")

@app.on_event("shutdown")
async def shutdown_db_client():
    global _beathelper_scheduler_task
    if _beathelper_scheduler_task:
        _beathelper_scheduler_task.cancel()
        _beathelper_scheduler_task = None
    client.close()
