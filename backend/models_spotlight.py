from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid

# ... (Previous imports remain, adding these for Spotlight)

class ProducerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    role_tag: Optional[str] = None
    bio: str = ""
    top_beat_url: Optional[str] = None
    social_links: dict = {} # { "instagram": "url", "youtube": "url" }
    tags: List[str] = []
    verification_status: str = "none"  # none | pending | approved | rejected
    verification_note: Optional[str] = None
    verification_applied_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    verification_application: Optional[dict] = None
    likes: int = 0
    views: int = 0
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProducerProfileUpdate(BaseModel):
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    top_beat_url: Optional[str] = None
    social_links: Optional[dict] = None
    tags: Optional[List[str]] = None


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
