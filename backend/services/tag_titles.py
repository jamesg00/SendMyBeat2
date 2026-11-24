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
    top_sound = top_sound_keyword(artist=artist_key, scored_tags=scored_tags)
    for item in out:
        item["covers"] = item["keywords"]
        item["score"] = score_title(item["title"], artist=artist_key, top_keyword=top_sound)["score"]
    return out[:MAX_SUGGESTIONS]


# What each title check is worth out of 100.
TITLE_CHECK_WEIGHTS = {
    "artist_first": 40,
    "length": 15,
    "top_keyword": 20,
    "beat_name": 15,
    "characters": 10,
}
ARTIST_FIRST_WITHIN = 40  # characters


def top_sound_keyword(*, artist: str, scored_tags: list[dict[str, Any]]) -> str:
    """The run's best-scoring sound tag (a genre or mood, no artist, no "type beat")."""
    artist_key = _key(artist)
    best, best_score = "", -1.0
    for entry in scored_tags or []:
        tag = _key(entry.get("tag", ""))
        if not tag or "type beat" in tag or (artist_key and artist_key in tag) or len(tag.split()) > 3:
            continue
        score = float(entry.get("score") or 0)
        if score > best_score:
            best, best_score = tag, score
    return best


def score_title(title: str, *, artist: str = "", top_keyword: str = "") -> dict[str, Any]:
    """Score a video title out of 100 with the checks behind it. No AI, no quota.

    Checks: the artist and "type beat" lead the title, it fits YouTube's 100 characters, it uses
    the run's top sound keyword, the beat name is in quotes, and it has no < or > (YouTube rejects
    titles with those). Checks that need a tag run (artist, top keyword) are skipped without one,
    and the score is out of the checks that ran.
    """
    raw = str(title or "")
    clean = " ".join(raw.split())
    lowered = clean.lower()
    artist_key = _key(artist)
    checks: list[dict[str, Any]] = []

    head = lowered[:ARTIST_FIRST_WITHIN]
    if artist_key:
        ok = artist_key in head and "type beat" in head
        checks.append({
            "id": "artist_first",
            "ok": ok,
            "message": (
                f"Artist and 'type beat' in the first {ARTIST_FIRST_WITHIN} characters" if ok
                else f"Start with '{_title_case(artist_key)} Type Beat' so searchers see it first"
            ),
        })
    else:
        ok = "type beat" in head
        checks.append({
            "id": "artist_first",
            "ok": ok,
            "message": (
                f"'Type beat' in the first {ARTIST_FIRST_WITHIN} characters" if ok
                else "Put the artist and 'type beat' at the start"
            ),
        })

    length = len(clean)
    checks.append({
        "id": "length",
        "ok": 0 < length <= YOUTUBE_TITLE_LIMIT,
        "message": (
            f"{length} of {YOUTUBE_TITLE_LIMIT} characters" if length <= YOUTUBE_TITLE_LIMIT
            else f"{length} of {YOUTUBE_TITLE_LIMIT} characters, {length - YOUTUBE_TITLE_LIMIT} over YouTube's limit"
        ),
    })

    if top_keyword:
        ok = _key(top_keyword) in lowered
        checks.append({
            "id": "top_keyword",
            "ok": ok,
            "message": (
                f"Uses '{_key(top_keyword)}', your run's top sound keyword" if ok
                else f"Add '{_key(top_keyword)}', your run's top sound keyword"
            ),
        })

    quoted = bool(re.search(r'["“”][^"“”]+["“”]', clean))
    checks.append({
        "id": "beat_name",
        "ok": quoted,
        "message": "Beat name in quotes" if quoted else 'Add the beat name in quotes, like "Neon"',
    })

    bad = "<" in raw or ">" in raw
    checks.append({
        "id": "characters",
        "ok": not bad,
        "message": "No characters YouTube rejects" if not bad else "Remove < and >, YouTube rejects titles with them",
    })

    total = sum(TITLE_CHECK_WEIGHTS[c["id"]] for c in checks)
    earned = sum(TITLE_CHECK_WEIGHTS[c["id"]] for c in checks if c["ok"])
    score = round(100 * earned / total) if total and clean else 0
    if bad or length > YOUTUBE_TITLE_LIMIT:
        score = min(score, 40)  # YouTube won't take it as is
    return {"title": clean, "score": score, "checks": checks}
