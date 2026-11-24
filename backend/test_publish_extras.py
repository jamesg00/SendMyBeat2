"""Phase 1: publish extras (services/publish_extras.py) and the small-size thumbnail check."""

import asyncio
import io
from datetime import datetime, timedelta, timezone

import pytest
from PIL import Image, ImageDraw

from services import publish_extras as pe
from services import thumbnail_legibility as tl

NOW = datetime(2026, 11, 24, 12, 0, tzinfo=timezone.utc)


def test_publish_at_forces_private():
    for privacy in ("public", "unlisted", "private"):
        body = pe.build_upload_body({"title": "t", "privacy_status": privacy, "publish_at": "2026-12-01T18:00:00Z"})
        assert body["status"] == {"privacyStatus": "private", "publishAt": "2026-12-01T18:00:00Z"}
    body = pe.build_upload_body({"title": "t", "privacy_status": "unlisted"})
    assert body["status"] == {"privacyStatus": "unlisted"}


def test_upload_body_keeps_music_category_and_language():
    body = pe.build_upload_body({"title": " T ", "description": "d", "tags": ["a", 3], "default_language": "en"})
    assert body["snippet"] == {
        "title": "T",
        "description": "d",
        "tags": ["a"],
        "categoryId": "10",
        "defaultLanguage": "en",
        "defaultAudioLanguage": "en",
    }


def test_parse_publish_at():
    assert pe.parse_publish_at("") is None
    assert pe.parse_publish_at("2026-12-01T10:00:00-08:00", now=NOW) == "2026-12-01T18:00:00Z"
    for bad in ("tomorrow", "2026-12-01T18:00:00", (NOW + timedelta(minutes=5)).isoformat(), (NOW + timedelta(days=200)).isoformat()):
        with pytest.raises(pe.PublishOptionError):
            pe.parse_publish_at(bad, now=NOW)


def test_parse_playlist_mode_and_language():
    assert pe.parse_playlist_mode(None) == "none"
    assert pe.parse_playlist_mode("Artist") == "artist"
    assert pe.parse_playlist_mode("PLabcdefghij123") == "PLabcdefghij123"
    with pytest.raises(pe.PublishOptionError):
        pe.parse_playlist_mode("not a playlist!")
    assert pe.parse_language("es-419") == "es-419"
    with pytest.raises(pe.PublishOptionError):
        pe.parse_language("english")


class Req:
    def __init__(self, result=None, exc=None):
        self.result, self.exc = result, exc

    def execute(self):
        if self.exc:
            raise self.exc
        return self.result


class HttpErr(Exception):
    def __init__(self, status):
        super().__init__(f"http {status}")
        self.resp = type("R", (), {"status": status})()


class FakeYouTube:
    def __init__(self, thumb_exc=None, playlists=None):
        self.thumb_exc = thumb_exc
        self.existing = playlists or []
        self.calls = []

    def thumbnails(self):
        yt = self

        class T:
            def set(self, videoId, media_body):
                yt.calls.append(("thumbnails.set", videoId))
                return Req({}, yt.thumb_exc)

        return T()

    def playlists(self):
        yt = self

        class P:
            def list(self, **kw):
                yt.calls.append(("playlists.list",))
                return Req({"items": yt.existing})

            def insert(self, part, body):
                yt.calls.append(("playlists.insert", body["snippet"]["title"]))
                return Req({"id": "PLnew0000000"})

        return P()

    def playlistItems(self):
        yt = self

        class I:
            def insert(self, part, body):
                yt.calls.append(("playlistItems.insert", body["snippet"]["playlistId"]))
                return Req({})

        return I()


def png_bytes(size=(1600, 900), draw=True):
    image = Image.new("RGB", size, (20, 20, 20))
    if draw:
        ImageDraw.Draw(image).rectangle((600, 250, 1000, 650), fill=(250, 250, 250))
    out = io.BytesIO()
    image.save(out, format="PNG")
    return out.getvalue()


def run_extras(yt, payload, scopes=None, artist="ken carson"):
    async def load():
        return png_bytes()

    return asyncio.run(
        pe.apply_publish_extras(
            yt, video_id="vid1", payload=payload, artist=artist, scopes=scopes, load_thumbnail=load, media_factory=lambda data: data
        )
    )


def test_failed_thumbnail_still_succeeds_with_a_warning():
    out = run_extras(FakeYouTube(thumb_exc=HttpErr(403)), {"thumbnail_file_id": "img1"})
    assert out["thumbnail_set"] is False
    assert out["thumbnails_not_allowed"] is True
    assert any("custom thumbnails" in w for w in out["warnings"])

    out = run_extras(FakeYouTube(thumb_exc=RuntimeError("boom")), {"thumbnail_file_id": "img1"})
    assert out["thumbnail_set"] is False and out["thumbnails_not_allowed"] is False and out["warnings"]


def test_thumbnail_is_set_when_allowed():
    yt = FakeYouTube()
    out = run_extras(yt, {"thumbnail_file_id": "img1", "publish_at": "2026-12-01T18:00:00Z"})
    assert out["thumbnail_set"] is True and out["warnings"] == []
    assert out["scheduled_for"] == "2026-12-01T18:00:00Z"
    assert ("thumbnails.set", "vid1") in yt.calls


def test_prepared_thumbnail_is_1280x720_jpeg_under_2mb():
    data = pe.prepare_thumbnail(png_bytes((3000, 3000)))
    assert len(data) <= pe.THUMBNAIL_MAX_BYTES
    with Image.open(io.BytesIO(data)) as image:
        assert image.size == (1280, 720) and image.format == "JPEG"


def test_artist_playlist_reused_or_created():
    yt = FakeYouTube(playlists=[{"id": "PLold0000000", "snippet": {"title": "Ken Carson Type Beats"}}])
    out = run_extras(yt, {"playlist_mode": "artist"}, scopes=[sorted(pe.PLAYLIST_SCOPES)[0]])
    assert out["playlist_id"] == "PLold0000000"
    assert ("playlists.insert", "Ken Carson Type Beats") not in yt.calls

    yt = FakeYouTube()
    out = run_extras(yt, {"playlist_mode": "artist"}, scopes=" ".join(pe.PLAYLIST_SCOPES))
    assert out["playlist_id"] == "PLnew0000000"
    assert ("playlists.insert", "Ken Carson Type Beats") in yt.calls


def test_playlist_without_scope_warns_and_calls_nothing():
    yt = FakeYouTube()
    out = run_extras(yt, {"playlist_mode": "artist"}, scopes=["https://www.googleapis.com/auth/youtube.upload"])
    assert out["playlist_id"] is None and any("Reconnect" in w for w in out["warnings"])
    assert yt.calls == []


def test_small_size_check_flags_flat_images():
    clear = tl.small_size_check(png_bytes())
    flat = tl.small_size_check(png_bytes(draw=False))
    assert clear["size"] == "168x94" and clear["preview"].startswith("data:image/png;base64,")
    assert clear["score"] > flat["score"]
    assert {c["id"] for c in clear["checks"]} == {"contrast", "busy", "focus"}
    assert not next(c for c in flat["checks"] if c["id"] == "contrast")["ok"]
