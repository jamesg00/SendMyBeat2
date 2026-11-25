"""The shared daily count of YouTube uploads (videos.insert has its own 100-a-day bucket)."""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

sys.path.append(str(Path(__file__).parent))

from services import youtube_quota  # noqa: E402

NOON_PT = datetime(2026, 11, 25, 20, 0, tzinfo=timezone.utc)


class _FakeSettings:
    """Enough of a Mongo collection for the upload counter's conditional updates."""

    def __init__(self, used=None):
        self.docs = {}
        if used is not None:
            key = youtube_quota.UPLOAD_KEY_PREFIX + youtube_quota.quota_day(NOON_PT)
            self.docs[key] = {"key": key, "upload_calls": used}

    async def find_one(self, query, projection=None):
        return self.docs.get(query["key"])

    async def update_one(self, query, update, upsert=False):
        key = query["key"]
        doc = self.docs.get(key)
        if doc is None:
            if upsert and "$setOnInsert" in update:
                self.docs[key] = dict(update["$setOnInsert"])
            return SimpleNamespace(modified_count=0)
        cond = query.get("upload_calls") or {}
        if "$lte" in cond and doc["upload_calls"] > cond["$lte"]:
            return SimpleNamespace(modified_count=0)
        if "$gte" in cond and doc["upload_calls"] < cond["$gte"]:
            return SimpleNamespace(modified_count=0)
        if "$inc" in update:
            doc["upload_calls"] += update["$inc"]["upload_calls"]
            return SimpleNamespace(modified_count=1)
        return SimpleNamespace(modified_count=0)


def _db(used=None):
    return {youtube_quota.SETTINGS_COLLECTION: _FakeSettings(used)}


def test_reserves_until_the_cap_then_refuses():
    db = _db()

    async def run():
        results = [await youtube_quota.try_use_upload(db, NOON_PT, cap=3) for _ in range(4)]
        return results, await youtube_quota.uploads_left(db, NOON_PT, cap=3)

    results, left = asyncio.run(run())
    assert results == [True, True, True, False]
    assert left == 0


def test_release_gives_a_reservation_back_on_the_same_day():
    db = _db(used=100)
    day = youtube_quota.quota_day(NOON_PT)

    async def run():
        refused = await youtube_quota.try_use_upload(db, NOON_PT, cap=100)
        await youtube_quota.release_upload(db, day)
        allowed = await youtube_quota.try_use_upload(db, NOON_PT, cap=100)
        return refused, allowed

    assert asyncio.run(run()) == (False, True)


def test_release_never_goes_below_zero():
    db = _db(used=0)

    async def run():
        await youtube_quota.release_upload(db, youtube_quota.quota_day(NOON_PT))
        return await youtube_quota.uploads_used(db, NOON_PT)

    assert asyncio.run(run()) == 0


def test_a_broken_database_allows_the_upload():
    class Broken:
        async def update_one(self, *args, **kwargs):
            raise RuntimeError("db down")

        async def find_one(self, *args, **kwargs):
            raise RuntimeError("db down")

    db = {youtube_quota.SETTINGS_COLLECTION: Broken()}

    async def run():
        return (
            await youtube_quota.try_use_upload(db, NOON_PT),
            await youtube_quota.uploads_left(db, NOON_PT, cap=100),
        )

    assert asyncio.run(run()) == (True, 100)
