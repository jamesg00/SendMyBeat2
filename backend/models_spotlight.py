from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid

# ... (Previous imports remain, adding these for Spotlight)

class ProducerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    username: str
    bio: str = ""
    top_beat_url: Optional[str] = None
    social_links: dict = {} # { "instagram": "url", "youtube": "url" }
    tags: List[str] = []
    likes: int = 0
    views: int = 0
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProducerProfileUpdate(BaseModel):
    bio: Optional[str] = None
    top_beat_url: Optional[str] = None
    social_links: Optional[dict] = None
    tags: Optional[List[str]] = None

class SpotlightResponse(BaseModel):
    featured_producers: List[ProducerProfile]
    trending_producers: List[ProducerProfile]
    new_producers: List[ProducerProfile]
