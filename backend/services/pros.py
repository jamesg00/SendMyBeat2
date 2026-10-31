"""Pros: profiles of producers who made it from YouTube type beats, and plans to copy their moves.

Profile text (story, notable work, moves) is written by us from press sources and lives here.
Photos, banners, subscriber counts and latest uploads come from each producer's own YouTube
channel through the API (refreshed daily, about 11 quota units for all five), linked back to the
channel. A plan is the moves a user picked, as steps; steps about uploads tick themselves off
from the user's SendMyBeat uploads.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

CHANNEL_CACHE = "pro_channel_cache"
PLANS = "style_plans"
CHANNEL_TTL = timedelta(hours=24)
UPLOADS_KEPT = 50

# kind: "uploads" (N uploads within `days`), "title_formula" (N titles led by "<Artist> Type Beat"),
# "title_pair" (N titles pairing two artists, "A x B"), "manual" (the user ticks it).
PROS: list[dict[str, Any]] = [
    {
        "id": "taz-taylor",
        "name": "Taz Taylor",
        "group": "Internet Money",
        "handles": ["@internetmoney", "@InternetMoneyRecords"],
        "search": "Internet Money Taz Taylor",
        "tagline": "Turned type beats into a label: cheap leases, sold to many artists at once.",
        "why": "Cheap leases sold the same beat to many artists, so income didn't wait on one hit.",
        "sound": ["leases", "collective", "trap"],
        "story": [
            "Started selling beats to help with his mother's medical bills; his first sale was $250.",
            "Sold over Twitter and PayPal first, then moved to YouTube type beats and says he earned over $500,000 a year from online leases.",
            "Co-founded Internet Money with Nick Mira and DT, and signed a publishing deal with Warner Chappell, APG and Atlantic in 2017.",
        ],
        "notable": [
            {"year": "2017", "text": "Over $500K a year from online leases (his own figure)"},
            {"year": "2017", "text": "Publishing deal with Warner Chappell, APG and Atlantic"},
            {"year": "", "text": "Placements with Gucci Mane, Kodak Black and Big Sean"},
        ],
        "moves": [
            {"id": "leases", "title": "Lease, don't sell", "body": "Cheap non-exclusive leases to many artists, keeping the copyright.",
             "steps": [{"kind": "manual", "text": "Add non-exclusive lease terms to your description template", "link": "descriptions"}]},
            {"id": "tiers", "title": "Tiered prices", "body": "Separate prices for MP3 leases, WAV leases and trackouts.",
             "steps": [{"kind": "manual", "text": "List MP3, WAV and trackout prices in your description", "link": "descriptions"}]},
            {"id": "series", "title": "Series around one sound", "body": "Several uploads for one artist's sound, so one search finds many of your beats.",
             "steps": [{"kind": "uploads", "text": "Upload 3 beats for one artist's sound in 14 days", "target": 3, "days": 14}]},
            {"id": "crew", "title": "Build a crew", "body": "A collective shares one channel and one brand.",
             "steps": [{"kind": "manual", "text": "Make one beat with another producer and credit them in the title"}]},
        ],
        "sources": [
            {"label": "Complex", "url": "https://complex.com/music/2018/06/internet-money-records-taz-taylor-nick-mira-interview"},
            {"label": "DJBooth", "url": "https://djbooth.net/features/2017-06-29-taz-taylor-interview/"},
        ],
    },
    {
        "id": "nick-mira",
        "name": "Nick Mira",
        "group": "Internet Money",
        "handles": ["@nickmira", "@NickMiraBeats"],
        "search": "Nick Mira producer",
        "tagline": "Produced \"Lucid Dreams\" from a beat pack sent straight to Juice WRLD.",
        "why": "He sent packs straight to artists, and one loop became a hit.",
        "sound": ["melodic", "guitar loops", "bouncy"],
        "story": [
            "Sold beats online under the type-beat label until around 2017, then co-founded Internet Money.",
            "Calls his sound melodic, spacious and bouncy; built \"Lean Wit Me\" from scratch, playing guitar live.",
            "When his credit on \"Lucid Dreams\" was questioned, he posted a video showing how he made it.",
        ],
        "notable": [
            {"year": "2018", "text": "Juice WRLD, \"Lucid Dreams\" (Hot 100 #2)"},
            {"year": "2018", "text": "Juice WRLD, \"Lean Wit Me\""},
            {"year": "", "text": "XXXTentacion and Trippie Redd placements"},
        ],
        "moves": [
            {"id": "packs", "title": "Send beat packs", "body": "Packs of beats emailed straight to artists; \"Lucid Dreams\" came from one.",
             "steps": [{"kind": "manual", "text": "Send a 5-beat pack to 3 artists with your Spotlight profile link"}]},
            {"id": "signature", "title": "A signature sound", "body": "Melodic loops people recognise as his.",
             "steps": [{"kind": "manual", "text": "Pick 3 sounds you'll use on every beat this month"}]},
            {"id": "make-first", "title": "Make what you like first", "body": "The type label is only for selling.",
             "steps": [{"kind": "uploads", "text": "Upload 2 beats you made for yourself in 7 days", "target": 2, "days": 7}]},
            {"id": "teach", "title": "Show how you made it", "body": "\"How I made it\" videos built the channel before the hits.",
             "steps": [{"kind": "manual", "text": "Post a \"how I made it\" video for your top beat"}]},
        ],
        "sources": [
            {"label": "The FADER", "url": "https://www.thefader.com/2019/05/15/nick-mira-taz-taylor-internet-money-interview"},
            {"label": "XXL", "url": "https://www.xxlmag.com/nick-mira-interview-internet-money-lucid-dreams/"},
        ],
    },
    {
        "id": "mjnichols",
        "name": "MjNichols",
        "group": "Type-beat YouTuber",
        "handles": ["@mjnichols", "@MjNicholsBeats"],
        "search": "mjNichols type beats",
        "tagline": "Uploads since 2012, titled for search; quit his day job by 2015.",
        "why": "Years of steady uploads, each titled the way buyers search.",
        "sound": ["artist titles", "consistency", "beat store"],
        "story": [
            "First upload in April 2012 was a Kendrick Lamar type beat; he kept naming beats after rising artists.",
            "Every description links to his beat store, so views turn into sales.",
            "By 2015 his store paid enough to quit his job at Starbucks; in 2020 his channel drew millions of views a month.",
        ],
        "notable": [
            {"year": "2012", "text": "First type beat upload"},
            {"year": "2015", "text": "Full-time from beat sales"},
            {"year": "2020", "text": "Millions of views a month (The Ringer)"},
        ],
        "moves": [
            {"id": "artist-titles", "title": "Title for search", "body": "\"<Rising artist> Type Beat\" catches artists while they're searched.",
             "steps": [{"kind": "title_formula", "text": "Lead 3 titles with \"<Artist> Type Beat\"", "target": 3}]},
            {"id": "store-link", "title": "Store link everywhere", "body": "Every description links to the store.",
             "steps": [{"kind": "manual", "text": "Put your store link at the top of your description template", "link": "descriptions"}]},
            {"id": "rhythm", "title": "Steady rhythm", "body": "Years of regular uploads, not one viral hit.",
             "steps": [{"kind": "uploads", "text": "Upload 4 beats in 14 days", "target": 4, "days": 14}]},
            {"id": "moods", "title": "Try mood searches", "body": "Soulker grew on mood and theme searches instead of artist names.",
             "steps": [{"kind": "manual", "text": "Title one upload by mood (\"dark piano type beat\")"}]},
        ],
        "sources": [{"label": "The Ringer", "url": "https://www.theringer.com/2020/07/17/music/type-beats-youtube-beatstars-mjnichols-soulker"}],
    },
    {
        "id": "cashmoneyap",
        "name": "CashMoneyAP",
        "group": "Guadeloupe producer",
        "channel_id": "UCsVTRE0hRlbo6Obo-qkYxaw",
        "handles": ["@CashMoneyAP"],
        "search": "CashMoneyAP type beat",
        "tagline": "Named every beat after the rapper he wanted on it. The rappers found them.",
        "sound": ["rising-artist titles", "type beats", "trap"],
        "story": [
            "Alex Petit started in high school in Guadeloupe, remaking Waka Flocka beats with no local scene to sell to.",
            "Put type beats on YouTube and BeatStars, each title naming the rapper he hoped would use it, with beats from $50.",
            "Lil Tjay and Polo G used his free beats on the way up; credits with Polo G, Migos, Chief Keef and Young Thug followed.",
        ],
        "why": "He titled beats for rappers on the rise, so they found his beats before they were famous.",
        "notable": [
            {"year": "2018", "text": "Forbes profile: beats from $50 on YouTube and BeatStars"},
            {"year": "", "text": "Early beats used by Lil Tjay and Polo G"},
            {"year": "", "text": "Placements with Migos, Chief Keef, Young Thug and Lil Skies"},
        ],
        "moves": [
            {"id": "name-the-rapper", "title": "Name the rapper", "body": "Put the artist you want on the beat at the front of the title.",
             "steps": [{"kind": "title_formula", "text": "Lead 3 titles with \"<Artist> Type Beat\"", "target": 3}]},
            {"id": "rising-artists", "title": "Rising artists, not stars", "body": "Pair two rappers on the way up; fewer producers compete for their names.",
             "steps": [{"kind": "title_pair", "text": "Title 2 uploads with two rising rappers (\"A x B Type Beat\")", "target": 2}]},
            {"id": "low-entry", "title": "Easy to say yes to", "body": "Low lease prices and a free download for tagged use let new artists try your beats.",
             "steps": [{"kind": "manual", "text": "Add a low lease price and your free-download terms to your description", "link": "descriptions"}]},
            {"id": "steady", "title": "Steady uploads", "body": "Show up in those rappers' searches every week.",
             "steps": [{"kind": "uploads", "text": "Upload 6 beats in 14 days", "target": 6, "days": 14}]},
        ],
        "sources": [
            {"label": "Forbes", "url": "https://www.forbes.com/sites/ogdenpayne/2018/06/26/meet-cashmoneyap-hip-hops-newest-entrepreneurial-producer/"},
            {"label": "Producergrind", "url": "https://producergrind.com/blogs/blog/the-rise-of-a-young-legend-cashmoneyap-cash-gang-records"},
        ],
    },
    {
        "id": "youngkio",
        "name": "YoungKio",
        "group": "Dutch producer",
        "handles": ["@youngkio", "@YoungKioBeats"],
        "search": "YoungKio producer",
        "tagline": "Sold the \"Old Town Road\" beat on BeatStars for about $30.",
        "why": "A cheap lease anyone could buy put his beat in front of an unknown artist who went viral.",
        "sound": ["samples", "standing out", "leases"],
        "story": [
            "Kiowa Roukema, a Dutch producer born in 1999.",
            "Built \"Old Town Road\" from a chopped, sped-up Nine Inch Nails sample with trap drums; Lil Nas X leased it for about $30 in 2018.",
            "The sample wasn't cleared at first; Trent Reznor later approved it and Nine Inch Nails share the writing credit.",
        ],
        "notable": [
            {"year": "2018", "text": "Lil Nas X, \"Old Town Road\""},
            {"year": "2019", "text": "Sample approved by Trent Reznor"},
        ],
        "moves": [
            {"id": "stand-out", "title": "Be unique", "body": "An unexpected sample made trap stood out in a store of look-alikes.",
             "steps": [{"kind": "manual", "text": "Make one beat around a sample from outside hip-hop"}]},
            {"id": "spread", "title": "Cheap leases spread far", "body": "One buyer can be the hit.",
             "steps": [{"kind": "uploads", "text": "Upload 3 beats in 14 days", "target": 3, "days": 14}]},
            {"id": "clear", "title": "Know your samples", "body": "A hit turns an uncleared sample into a legal problem.",
             "steps": [{"kind": "manual", "text": "Write down the source of every sample you use"}]},
        ],
        "sources": [
            {"label": "ABC News", "url": "https://abcnews.com/Entertainment/lil-nas-bought-town-road-beat-30-story/story?id=64511949"},
            {"label": "Splice", "url": "https://splice.com/blog/youngkio-q-and-a/"},
        ],
    },
]
BY_ID = {pro["id"]: pro for pro in PROS}


# ---- reading titles


_LEAD_ARTIST = re.compile(r"^\s*[\w$.'&\s]{2,40}?\s+type\s+beat\b", re.IGNORECASE)
_PAIR = re.compile(r"\b\w[\w$.'&\s]*\s+x\s+\w[\w$.'&\s]*\s+type\s+beat\b", re.IGNORECASE)


def leads_with_artist(title: str) -> bool:
    return bool(_LEAD_ARTIST.match(title or ""))


def pairs_artists(title: str) -> bool:
    return bool(_PAIR.search(title or ""))


def _when(value: Any) -> Optional[datetime]:
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(value, datetime):
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def title_patterns(uploads: list[dict[str, Any]]) -> dict[str, Any]:
    """Share of titles led by the artist, with quotes, a year, or two artists; pace and weekdays."""
    titles = [str(u.get("title") or "") for u in uploads if u.get("title")]
    dates = sorted(d for d in (_when(u.get("published_at")) for u in uploads) if d)
    n = len(titles)
    share = lambda hits: round(100 * hits / n) if n else None  # noqa: E731
    weekdays = [0] * 7
    for d in dates:
        weekdays[d.weekday()] += 1
    span_weeks = max(1.0, (dates[-1] - dates[0]).days / 7) if len(dates) > 1 else None
    return {
        "uploads": n,
        "lead_artist_pct": share(sum(leads_with_artist(t) for t in titles)),
        "quotes_pct": share(sum('"' in t for t in titles)),
        "year_pct": share(sum(bool(re.search(r"\b20\d\d\b", t)) for t in titles)),
        "pair_pct": share(sum(pairs_artists(t) for t in titles)),
        "per_week": round(len(dates) / span_weeks, 1) if span_weeks else None,
        "weekdays": weekdays,
    }


# ---- plans


def build_plan(pro_id: str, move_ids: list[str], *, user_id: str, now: datetime | None = None) -> dict[str, Any]:
    pro = BY_ID[pro_id]
    chosen = [m for m in pro["moves"] if m["id"] in set(move_ids)] or pro["moves"][:1]
    steps = []
    for move in chosen:
        for i, step in enumerate(move["steps"]):
            steps.append({**step, "id": f"{move['id']}-{i}", "move": move["title"], "done": False})
    return {
        "user_id": user_id,
        "pro_id": pro_id,
        "pro_name": pro["name"],
        "created_at": now or datetime.now(timezone.utc),
        "steps": steps,
    }


def plan_progress(plan: dict[str, Any], my_uploads: list[dict[str, Any]], now: datetime | None = None) -> dict[str, Any]:
    """Fill in each step's count from uploads since the plan started; manual steps keep their tick."""
    now = now or datetime.now(timezone.utc)
    start = _when(plan.get("created_at")) or now
    since = [u for u in my_uploads if (_when(u.get("published_at")) or start) >= start]
    steps = []
    for step in plan.get("steps") or []:
        step = dict(step)
        kind = step.get("kind")
        if kind == "uploads":
            window = now - timedelta(days=int(step.get("days") or 14))
            count = sum(1 for u in since if (_when(u.get("published_at")) or start) >= max(start, window))
            step.update(count=min(count, step["target"]), done=count >= step["target"])
        elif kind in ("title_formula", "title_pair"):
            test = leads_with_artist if kind == "title_formula" else pairs_artists
            count = sum(1 for u in since if test(str(u.get("title") or "")))
            step.update(count=min(count, step["target"]), done=count >= step["target"])
        steps.append(step)
    done = sum(1 for s in steps if s.get("done"))
    upcoming = next((s for s in steps if not s.get("done")), None)
    return {**plan, "steps": steps, "done": done, "total": len(steps), "next": upcoming}


# ---- channels


def _resolve_channel_id(youtube: Any, pro: dict[str, Any]) -> tuple[Optional[str], int]:
    """(channel id, quota units spent): handles first (1 unit each), one search as a fallback (100)."""
    units = 0
    for handle in pro.get("handles") or []:
        units += 1
        try:
            items = youtube.channels().list(part="id", forHandle=handle).execute().get("items") or []
        except Exception as exc:
            logger.warning("Handle lookup failed for %s: %s", handle, exc)
            items = []
        if items:
            return items[0].get("id"), units
    units += 100
    try:
        items = youtube.search().list(part="snippet", q=pro["search"], type="channel", maxResults=1).execute().get("items") or []
    except Exception as exc:
        logger.warning("Channel search failed for %s: %s", pro["id"], exc)
        return None, units
    return ((items[0].get("id") or {}).get("channelId") if items else None), units


def _fetch_channel(youtube: Any, channel_id: str) -> dict[str, Any]:
    payload = youtube.channels().list(part="snippet,statistics,brandingSettings,contentDetails", id=channel_id).execute()
    items = payload.get("items") or []
    if not items:
        return {}
    item = items[0]
    snippet, stats = item.get("snippet") or {}, item.get("statistics") or {}
    thumbs = snippet.get("thumbnails") or {}
    photo = (thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}).get("url")
    banner = ((item.get("brandingSettings") or {}).get("image") or {}).get("bannerExternalUrl")
    uploads_list = ((item.get("contentDetails") or {}).get("relatedPlaylists") or {}).get("uploads")
    uploads: list[dict[str, Any]] = []
    if uploads_list:
        playlist = youtube.playlistItems().list(part="snippet,contentDetails", playlistId=uploads_list, maxResults=UPLOADS_KEPT).execute()
        for it in playlist.get("items") or []:
            sn = it.get("snippet") or {}
            vid = (it.get("contentDetails") or {}).get("videoId")
            if vid:
                uploads.append({
                    "video_id": vid,
                    "title": sn.get("title") or "",
                    "published_at": (it.get("contentDetails") or {}).get("videoPublishedAt") or sn.get("publishedAt"),
                    "thumbnail": ((sn.get("thumbnails") or {}).get("medium") or {}).get("url"),
                })
        if uploads:
            views = youtube.videos().list(part="statistics", id=",".join(u["video_id"] for u in uploads)).execute()
            by_id = {v.get("id"): int((v.get("statistics") or {}).get("viewCount") or 0) for v in views.get("items") or []}
            for u in uploads:
                u["views"] = by_id.get(u["video_id"], 0)
    return {
        "channel_id": channel_id,
        "channel_title": snippet.get("title"),
        "channel_url": f"https://www.youtube.com/channel/{channel_id}",
        "photo": photo,
        "banner": banner,
        "subscribers": None if stats.get("hiddenSubscriberCount") else int(stats.get("subscriberCount") or 0),
        "total_views": int(stats.get("viewCount") or 0),
        "video_count": int(stats.get("videoCount") or 0),
        "uploads": uploads,
    }


def is_stale(channel: dict[str, Any] | None, now: datetime | None = None) -> bool:
    fetched = _when((channel or {}).get("fetched_at"))
    return not fetched or (now or datetime.now(timezone.utc)) - fetched >= CHANNEL_TTL


_refreshing = asyncio.Lock()


async def refresh_channels(db: Any, youtube: Any, *, force: bool = False, now: datetime | None = None) -> dict[str, int]:
    """Bring every pro's channel data up to date (once a day). Never raises."""
    now = now or datetime.now(timezone.utc)
    stats = {"refreshed": 0, "units": 0}
    if youtube is None:
        return stats
    async with _refreshing:
        for pro in PROS:
            cached = await db[CHANNEL_CACHE].find_one({"pro_id": pro["id"]}, {"_id": 0}) or {}
            if not force and not is_stale(cached, now):
                continue
            try:
                channel_id = cached.get("channel_id") or pro.get("channel_id")
                if not channel_id:
                    channel_id, units = await asyncio.to_thread(_resolve_channel_id, youtube, pro)
                    stats["units"] += units
                if not channel_id:
                    continue
                data = await asyncio.to_thread(_fetch_channel, youtube, channel_id)
                stats["units"] += 3
                if not data:
                    continue
                await db[CHANNEL_CACHE].update_one(
                    {"pro_id": pro["id"]}, {"$set": {"pro_id": pro["id"], **data, "fetched_at": now}}, upsert=True
                )
                stats["refreshed"] += 1
            except Exception as exc:
                logger.warning("Refreshing %s's channel failed: %s", pro["id"], exc)
    return stats


async def channels_by_pro(db: Any) -> dict[str, dict[str, Any]]:
    docs = await db[CHANNEL_CACHE].find({}, {"_id": 0}).to_list(len(PROS) * 2)
    return {doc["pro_id"]: doc for doc in docs if doc.get("pro_id")}


def card(pro: dict[str, Any], channel: dict[str, Any] | None) -> dict[str, Any]:
    channel = channel or {}
    return {
        "id": pro["id"],
        "name": pro["name"],
        "group": pro["group"],
        "tagline": pro["tagline"],
        "sound": pro["sound"],
        # A press photo used with permission wins over the YouTube channel picture.
        "photo": pro.get("photo") or channel.get("photo"),
        "photo_credit": pro.get("photo_credit") if pro.get("photo") else None,
        "banner": channel.get("banner"),
        "subscribers": channel.get("subscribers"),
        "channel_url": channel.get("channel_url") or f"https://www.youtube.com/{(pro.get('handles') or [''])[0]}",
        "channel_title": channel.get("channel_title"),
    }


def detail(pro: dict[str, Any], channel: dict[str, Any] | None) -> dict[str, Any]:
    channel = channel or {}
    uploads = channel.get("uploads") or []
    return {
        **card(pro, channel),
        "story": pro["story"],
        "why": pro.get("why"),
        "notable": pro["notable"],
        "moves": [{**{k: m[k] for k in ("id", "title", "body")}, "steps": [st["text"] for st in m["steps"]]} for m in pro["moves"]],
        "sources": pro["sources"],
        "total_views": channel.get("total_views"),
        "latest_uploads": uploads[:10],
        "patterns": title_patterns(uploads),
    }
