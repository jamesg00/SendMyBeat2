import re
from urllib.parse import urlparse

from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

# ... (Previous imports remain, adding these for Spotlight)

class ProducerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    role_tag: Optional[str] = None
    bio: str = ""
    top_beat_url: Optional[str] = None
    # {"kind": "youtube" | "audio", "url", "title", ...}; top_beat_url mirrors its url for older clients.
    top_beat: Optional[dict] = None
    social_links: Dict[str, Any] = Field(default_factory=dict) # { "instagram": "url", "youtube": "url" }
    tags: List[str] = Field(default_factory=list)
    verification_status: str = "none"  # none | pending | approved | rejected
    verification_note: Optional[str] = None
    verification_applied_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    verification_application: Optional[dict] = None
    likes: int = 0
    views: int = 0
    # In-app hearts and follows from other SendMyBeat users; kept apart from `likes`,
    # which the metrics refresh overwrites with YouTube likes.
    app_likes: int = 0
    followers: int = 0
    featured: bool = False
    google_connected: bool = False
    spotlight_eligible: bool = False
    spotlight_tier: str = "Bronze"
    spotlight_score: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    total_days_completed: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

SOCIAL_LINK_KEYS = {"youtube", "instagram", "tiktok", "twitter", "x", "beatstars", "soundcloud", "spotify", "website"}
_IMAGE_DATA_URL = re.compile(r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")
# The server's own default avatar is a URL-encoded SVG; it's only ever shown as an image.
_SVG_DATA_URL = re.compile(r"^data:image/svg\+xml(;utf8)?,")


def clean_public_link(value: str, *, field: str) -> str:
    """An empty string, or an https link with a hostname. http:// is upgraded; any other scheme
    (intent:, tel:, javascript:, app links) is rejected, since clients open these links."""
    value = (value or "").strip()
    if not value:
        return ""
    if len(value) > 500:
        raise ValueError(f"{field} link is too long.")
    if not re.match(r"^[a-z][a-z0-9+.-]*:", value, re.IGNORECASE):
        value = f"https://{value}"
    parsed = urlparse(value)
    if parsed.scheme.lower() == "http":
        value = "https://" + value[len("http://"):]
        parsed = urlparse(value)
    if parsed.scheme.lower() != "https" or not parsed.hostname or "." not in parsed.hostname:
        raise ValueError(f"{field} must be an https:// link.")
    return value


class ProducerProfileUpdate(BaseModel):
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    bio: Optional[str] = None
    top_beat_url: Optional[str] = None
    social_links: Optional[dict] = None
    tags: Optional[List[str]] = None

    @field_validator("bio")
    @classmethod
    def _bio(cls, v):
        if v is not None and len(v) > 500:
            raise ValueError("Bio can be at most 500 characters.")
        return v

    @field_validator("tags")
    @classmethod
    def _tags(cls, v):
        if v is None:
            return v
        cleaned = [str(t).strip() for t in v if str(t).strip()]
        if len(cleaned) > 15 or any(len(t) > 40 for t in cleaned):
            raise ValueError("Use at most 15 tags of up to 40 characters.")
        return cleaned

    @field_validator("social_links")
    @classmethod
    def _social_links(cls, v):
        if v is None:
            return v
        if not isinstance(v, dict):
            raise ValueError("social_links must be an object.")
        out = {}
        for key, value in v.items():
            key = str(key).lower()
            if key not in SOCIAL_LINK_KEYS:
                raise ValueError(f"Unknown link type: {key}.")
            if value is not None and not isinstance(value, str):
                raise ValueError(f"{key} must be a string.")
            out[key] = clean_public_link(value or "", field=key)
        return out

    @field_validator("top_beat_url")
    @classmethod
    def _top_beat_url(cls, v):
        return None if v is None else clean_public_link(v, field="Top beat")

    @field_validator("avatar_url", "banner_url")
    @classmethod
    def _image(cls, v):
        # The upload endpoints return data URLs; external images must be https.
        if v is None or v == "":
            return v
        if len(v) > 3_000_000:
            raise ValueError("Image is too large.")
        if _IMAGE_DATA_URL.match(v) or _SVG_DATA_URL.match(v):
            return v
        return clean_public_link(v, field="Image")


class VerificationApplicationRequest(BaseModel):
    stage_name: Optional[str] = None
    main_platform_url: Optional[str] = None
    notable_work: Optional[str] = None
    reason: str


class VerificationReviewRequest(BaseModel):
    user_id: str
    action: str  # approve | reject
    note: Optional[str] = None

class SpotlightResponse(BaseModel):
    featured_producers: List[ProducerProfile]
    trending_producers: List[ProducerProfile]
    new_producers: List[ProducerProfile]
    all_producers: List[ProducerProfile] = []
