"""Publish extras for a YouTube upload: scheduling, language, custom thumbnail and playlist.

The upload body is built here so scheduling rules live in one place: a video with publishAt
must be private until then. The extras after videos.insert (thumbnail, playlist) only ever
warn. A video that reached YouTube counts as uploaded even if they fail.

Quota (Data API cost table): thumbnails.set 50 units; playlistItems.insert 50, plus
playlists.insert 50 the first time for an artist.
"""

from __future__ import annotations

import asyncio
import io
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Optional

SCHEDULE_MIN_LEAD = timedelta(minutes=15)
SCHEDULE_MAX_LEAD = timedelta(days=180)
PLAYLIST_SCOPES = frozenset({
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl",
})
THUMBNAIL_SIZE = (1280, 720)
THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024  # YouTube's custom thumbnail limit
PLAYLIST_ID_RE = re.compile(r"^[A-Za-z0-9_-]{10,64}$")
LANGUAGE_RE = re.compile(r"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$")


class PublishOptionError(ValueError):
    """A publish option the producer sent can't be used; the message says why."""


def parse_publish_at(value: Any, *, now: Optional[datetime] = None) -> Optional[str]:
    """ISO time -> UTC 'YYYY-MM-DDTHH:MM:SSZ', or None when not scheduling. Must be 15 min to 180 days out."""
    text = str(value or "").strip()
    if not text:
        return None
    try:
        when = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise PublishOptionError("publish_at must be an ISO date and time, like 2026-12-01T18:00:00Z.") from exc
    if when.tzinfo is None:
        raise PublishOptionError("publish_at needs a time zone, like 2026-12-01T18:00:00Z.")
    current = now or datetime.now(timezone.utc)
    when = when.astimezone(timezone.utc).replace(microsecond=0)
    if when < current + SCHEDULE_MIN_LEAD:
        raise PublishOptionError("Schedule it at least 15 minutes from now.")
    if when > current + SCHEDULE_MAX_LEAD:
        raise PublishOptionError("Schedule it within the next 180 days.")
    return when.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_playlist_mode(value: Any) -> str:
    """'none', 'artist', or a playlist id."""
    text = str(value or "").strip()
    if not text or text.lower() == "none":
        return "none"
    if text.lower() == "artist":
        return "artist"
    if PLAYLIST_ID_RE.match(text):
        return text
    raise PublishOptionError("playlist_mode must be none, artist, or a playlist id.")


def parse_language(value: Any) -> Optional[str]:
    text = str(value or "").strip()
    if not text:
        return None
    if not LANGUAGE_RE.match(text):
        raise PublishOptionError("default_language must be a language code like en or es-419.")
    return text


def build_upload_body(payload: dict) -> dict:
    """The videos.insert body. With publish_at the video is private until YouTube publishes it."""
    snippet: dict[str, Any] = {
        "title": str(payload.get("title") or "").strip(),
        "description": str(payload.get("description") or "").strip(),
        "tags": [tag for tag in (payload.get("tags") or []) if isinstance(tag, str)],
        "categoryId": "10",
    }
    language = payload.get("default_language")
    if language:
        snippet["defaultLanguage"] = language
        snippet["defaultAudioLanguage"] = language
    status: dict[str, Any] = {"privacyStatus": str(payload.get("privacy_status") or "public")}
    publish_at = payload.get("publish_at")
    if publish_at:
        status["privacyStatus"] = "private"
        status["publishAt"] = publish_at
    return {"snippet": snippet, "status": status}


def artist_playlist_title(artist: str) -> str:
    name = " ".join(str(artist or "").split()).title()
    return f"{name} Type Beats" if name else "Type Beats"


def has_playlist_scope(scopes: Any) -> bool:
    granted = set(scopes.split()) if isinstance(scopes, str) else set(scopes or [])
    return bool(granted & PLAYLIST_SCOPES)


def prepare_thumbnail(image_bytes: bytes) -> bytes:
    """Cover-crop to 1280x720 and save as JPEG under YouTube's 2 MB limit."""
    from PIL import Image, ImageOps

    with Image.open(io.BytesIO(image_bytes)) as source:
        frame = ImageOps.exif_transpose(source)  # a GIF opens on its first frame
        image = ImageOps.fit(frame.convert("RGB"), THUMBNAIL_SIZE, Image.LANCZOS)
    for quality in (90, 82, 74, 66, 58):
        out = io.BytesIO()
        image.save(out, format="JPEG", quality=quality, optimize=True)
        if out.tell() <= THUMBNAIL_MAX_BYTES:
            return out.getvalue()
    return out.getvalue()


def _http_status(exc: Exception) -> int:
    resp = getattr(exc, "resp", None)
    try:
        return int(getattr(resp, "status", 0) or 0)
    except (TypeError, ValueError):
        return 0


def _run(request) -> Awaitable[dict]:
    return asyncio.to_thread(request.execute)


async def set_thumbnail(youtube, video_id: str, image_bytes: bytes, *, media_factory: Callable[[bytes], Any]) -> dict:
    """thumbnails.set. Returns {thumbnail_set, warning, not_allowed}. Never raises."""
    try:
        data = await asyncio.to_thread(prepare_thumbnail, image_bytes)
        await _run(youtube.thumbnails().set(videoId=video_id, media_body=media_factory(data)))
        return {"thumbnail_set": True, "warning": None, "not_allowed": False}
    except Exception as exc:  # noqa: BLE001 - a thumbnail must never fail the upload
        status = _http_status(exc)
        if status == 403:
            return {
                "thumbnail_set": False,
                "warning": "Your channel can't use custom thumbnails yet (verify it on YouTube). The video uses a frame instead.",
                "not_allowed": True,
            }
        return {"thumbnail_set": False, "warning": "Couldn't set the custom thumbnail. You can add it in YouTube Studio.", "not_allowed": False}


async def find_or_create_artist_playlist(youtube, artist: str, *, privacy: str = "public") -> str:
    title = artist_playlist_title(artist)
    page_token = None
    for _ in range(4):  # up to 200 playlists
        response = await _run(youtube.playlists().list(part="snippet", mine=True, maxResults=50, pageToken=page_token))
        for item in response.get("items") or []:
            if str((item.get("snippet") or {}).get("title") or "").strip().lower() == title.lower():
                return item["id"]
        page_token = response.get("nextPageToken")
        if not page_token:
            break
    created = await _run(
        youtube.playlists().insert(
            part="snippet,status",
            body={
                "snippet": {"title": title, "description": f"{title}, uploaded with SendMyBeat."},
                "status": {"privacyStatus": privacy if privacy in {"public", "unlisted"} else "public"},
            },
        )
    )
    return created["id"]


async def add_to_playlist(youtube, video_id: str, *, playlist_mode: str, artist: str, scopes: Any) -> dict:
    """Returns {playlist_id, warning}. Never raises."""
    if playlist_mode == "none":
        return {"playlist_id": None, "warning": None}
    if not has_playlist_scope(scopes):
        return {"playlist_id": None, "warning": "Reconnect YouTube and allow playlists to add uploads to a playlist."}
    try:
        if playlist_mode == "artist":
            if not str(artist or "").strip():
                return {"playlist_id": None, "warning": "Pick a tag run to file this under an artist playlist."}
            playlist_id = await find_or_create_artist_playlist(youtube, artist)
        else:
            playlist_id = playlist_mode
        await _run(
            youtube.playlistItems().insert(
                part="snippet",
                body={"snippet": {"playlistId": playlist_id, "resourceId": {"kind": "youtube#video", "videoId": video_id}}},
            )
        )
        return {"playlist_id": playlist_id, "warning": None}
    except Exception:  # noqa: BLE001 - a playlist must never fail the upload
        return {"playlist_id": None, "warning": "Couldn't add the video to the playlist. You can add it in YouTube Studio."}


async def apply_publish_extras(
    youtube,
    *,
    video_id: str,
    payload: dict,
    artist: str = "",
    scopes: Any = None,
    load_thumbnail: Optional[Callable[[], Awaitable[Optional[bytes]]]] = None,
    media_factory: Optional[Callable[[bytes], Any]] = None,
) -> dict:
    """Run the extras after videos.insert. Returns {thumbnail_set, playlist_id, scheduled_for, warnings, thumbnails_not_allowed}."""
    warnings: list[str] = []
    result: dict[str, Any] = {
        "thumbnail_set": False,
        "playlist_id": None,
        "scheduled_for": payload.get("publish_at") or None,
        "thumbnails_not_allowed": False,
    }
    if payload.get("thumbnail_file_id") and load_thumbnail and media_factory:
        try:
            image_bytes = await load_thumbnail()
        except Exception:  # noqa: BLE001
            image_bytes = None
        if image_bytes:
            thumb = await set_thumbnail(youtube, video_id, image_bytes, media_factory=media_factory)
            result["thumbnail_set"] = thumb["thumbnail_set"]
            result["thumbnails_not_allowed"] = thumb["not_allowed"]
            if thumb["warning"]:
                warnings.append(thumb["warning"])
        else:
            warnings.append("Couldn't read the thumbnail image, so the video uses a frame instead.")
    playlist = await add_to_playlist(
        youtube, video_id, playlist_mode=str(payload.get("playlist_mode") or "none"), artist=artist, scopes=scopes
    )
    result["playlist_id"] = playlist["playlist_id"]
    if playlist["warning"]:
        warnings.append(playlist["warning"])
    result["warnings"] = warnings
    return result
