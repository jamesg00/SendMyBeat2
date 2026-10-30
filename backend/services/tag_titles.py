"""Title suggestions built from a tag run's best keywords. No AI and no YouTube quota.

Type-beat titles that lead with the artist do best, so every suggestion starts with
"<Artist> Type Beat". The beat name goes in quotes, and the rest of the space carries the run's
other high-scoring keywords: a crossover ("Future x Gunna"), a related search ("Mask Off Type
Beat"), a sound ("Dark Trap") or the year. Suggestions are ranked by how much tag score they
cover and kept under YouTube's 100-character limit.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

YOUTUBE_TITLE_LIMIT = 100
MAX_SUGGESTIONS = 5
PLACEHOLDER_BEAT = "BEAT NAME"


def _key(text: str) -> str:
    return " ".join(str(text or "").lower().split())


def _title_case(text: str) -> str:
    """Title case, keeping the crossover "x" lower case."""
    return " ".join(word if word == "x" else word[:1].upper() + word[1:] for word in _key(text).split())


def _without_type_beat(tag: str) -> str:
    return re.sub(r"\s*\btype beats?\b\s*", " ", _key(tag)).strip()


def suggest_titles(
    *,
    artist: str,
    scored_tags: list[dict[str, Any]],
    beat_name: str = "",
    year: int | None = None,
) -> list[dict[str, Any]]:
    artist_key = _key(artist)
    if not artist_key:
        return []
    year = year or datetime.now(timezone.utc).year
    beat = (beat_name or "").strip().upper() or PLACEHOLDER_BEAT
    head = f"{_title_case(artist_key)} Type Beat"
    entries = sorted(
        ({"tag": _key(e.get("tag", "")), "score": float(e.get("score") or 0), "bucket": e.get("bucket")} for e in scored_tags if e.get("tag")),
        key=lambda e: -e["score"],
    )

    crossovers, related, sounds = [], [], []
    for e in entries:
        tag = e["tag"]
        if f" x " in f" {tag} " and artist_key in tag:
            other = _without_type_beat(tag).replace(artist_key, "").replace(" x ", " ").strip(" x")
            if other:
                crossovers.append(other)
        elif "type beat" in tag and artist_key not in tag:
            name = _without_type_beat(tag)
            if name and not name.isdigit():
                related.append(name)
        elif "type beat" not in tag and artist_key not in tag and len(tag.split()) <= 3:
            sounds.append(tag)

    candidates = [
        f'{head} - "{beat}"',
        *[f'{_title_case(artist_key)} x {_title_case(o)} Type Beat - "{beat}"' for o in crossovers[:2]],
        *[f'{head} - "{beat}" | {_title_case(r)} Type Beat' for r in related[:2]],
        *[f'{head} - "{beat}" | {_title_case(snd)}{"" if "instrumental" in snd else " Instrumental"}' for snd in sounds[:1]],
    ]
    if any(str(year) in e["tag"] for e in entries):
        candidates.append(f'{head} {year} - "{beat}"')

    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for title in candidates:
        lowered = _key(title)
        if lowered in seen or len(title) > YOUTUBE_TITLE_LIMIT:
            continue
        seen.add(lowered)
        covered = [e["tag"] for e in entries if e["tag"] and e["tag"] in lowered]
        out.append({
            "title": title,
            "keywords": covered,
            "coverage": round(sum(e["score"] for e in entries if e["tag"] in covered)),
            "length": len(title),
        })
    out.sort(key=lambda item: -item["coverage"])
    return out[:MAX_SUGGESTIONS]
