"""Build a YouTube description from a tag run. Deterministic: no AI, no credits, no quota.

Layout, top to bottom (YouTube shows the first two lines above "...more"):
  1. keyword line: the run's best keywords, so search and the preview match the title
  2. buy link, then BPM and key when known
  3. a short paragraph using the top sound keyword
  4. chapters, only when they are valid for YouTube
  5. the producer's saved template (links, contact), when one is chosen
  6. 3 to 5 hashtags drawn from the run's own tags

YouTube's rules this follows: at most 5000 bytes, no < or >, chapters start at 00:00 with
at least 3 of them 10 seconds or more apart, and more than 15 hashtags makes YouTube ignore all of them.
"""

from __future__ import annotations

import re
from typing import Any, Iterable

DESCRIPTION_MAX_BYTES = 5000
HASHTAGS_MIN = 3
HASHTAGS_MAX = 5
YOUTUBE_HASHTAG_LIMIT = 15  # more than this and YouTube ignores every hashtag in the description
CHAPTERS_MIN = 3
CHAPTER_MIN_GAP_SECONDS = 10
KEYWORD_LINE_COUNT = 3

_HASHTAG_RE = re.compile(r"(?<![\w#])#([^\s#]+)")
_NON_TAG_CHARS = re.compile(r"[^0-9a-z]+")


def _clean(text: Any) -> str:
    return " ".join(str(text or "").split())


def byte_length(text: str) -> int:
    return len(text.encode("utf-8"))


def hashtag_word(text: str) -> str:
    """'Ken Carson type beat' -> 'kencarsontypebeat': lowercase letters and digits, no spaces."""
    return _NON_TAG_CHARS.sub("", str(text or "").lower())


def count_hashtags(text: str) -> int:
    return len(_HASHTAG_RE.findall(text or ""))


def format_timestamp(seconds: float) -> str:
    total = max(0, int(seconds))
    hours, rest = divmod(total, 3600)
    minutes, secs = divmod(rest, 60)
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes:02d}:{secs:02d}"


def validate_chapters(chapters: Iterable[dict] | None) -> tuple[list[dict], str | None]:
    """Return (clean chapters, None) when YouTube would show them, else ([], why not)."""
    rows: list[dict] = []
    for raw in chapters or []:
        if not isinstance(raw, dict):
            continue
        label = _clean(raw.get("label")).replace("<", "").replace(">", "")
        try:
            t = float(raw.get("t"))
        except (TypeError, ValueError):
            continue
        if label:
            rows.append({"t": t, "label": label[:100]})
    if not rows:
        return [], None
    rows.sort(key=lambda row: row["t"])
    if rows[0]["t"] != 0:
        return [], "Chapters left out: the first one has to start at 00:00."
    if len(rows) < CHAPTERS_MIN:
        return [], f"Chapters left out: YouTube needs at least {CHAPTERS_MIN}."
    for before, after in zip(rows, rows[1:]):
        if after["t"] - before["t"] < CHAPTER_MIN_GAP_SECONDS:
            return [], f"Chapters left out: each one has to be at least {CHAPTER_MIN_GAP_SECONDS} seconds after the last."
    return rows, None


def pick_hashtags(*, artist: str, tags: Iterable[str], top_keyword: str = "") -> list[str]:
    """3 to 5 hashtags, all taken from what the run found: artist type beat first, then the artist."""
    picked: list[str] = []

    def add(text: str) -> None:
        word = hashtag_word(text)
        if 3 <= len(word) <= 40 and word not in picked and len(picked) < HASHTAGS_MAX:
            picked.append(word)

    artist_clean = _clean(artist)
    if artist_clean:
        add(f"{artist_clean} type beat")
        add(artist_clean)
    add("type beat")
    if top_keyword:
        add(f"{top_keyword} type beat" if "type beat" not in top_keyword.lower() else top_keyword)
    for tag in tags:
        tag_clean = _clean(tag)
        # Short tags only: long phrases make unreadable hashtags.
        if tag_clean and len(tag_clean.split()) <= 4:
            add(tag_clean)
    for fallback in ("beats", "instrumental"):
        if len(picked) >= HASHTAGS_MIN:
            break
        add(fallback)
    return [f"#{word}" for word in picked]


def keyword_line(*, title_keywords: Iterable[str]) -> str:
    seen: list[str] = []
    for keyword in title_keywords:
        clean = _clean(keyword)
        if clean and clean.lower() not in {item.lower() for item in seen}:
            seen.append(clean)
        if len(seen) >= KEYWORD_LINE_COUNT:
            break
    return " | ".join(seen)


def build_description(
    *,
    artist: str,
    beat_name: str = "",
    tags: Iterable[str] = (),
    top_keyword: str = "",
    buy_link: str = "",
    bpm: float | int | None = None,
    key: str = "",
    chapters: Iterable[dict] | None = None,
    include_chapters: bool = True,
    template_text: str = "",
) -> dict[str, Any]:
    """Return {content, hashtags, bytes, warnings}. Nothing is saved here."""
    warnings: list[str] = []
    tag_list = [_clean(tag) for tag in tags if _clean(tag)]
    artist_clean = _clean(artist)
    beat = _clean(beat_name).strip("\"'“”")
    sound = _clean(top_keyword)

    title_keywords = [f"{artist_clean} type beat"] if artist_clean else []
    title_keywords += [tag for tag in tag_list if tag.lower() != f"{artist_clean} type beat".lower()]
    head = keyword_line(title_keywords=title_keywords)
    if beat:
        head = f'{head} - "{beat.upper()}"' if head else f'"{beat.upper()}"'

    lines: list[str] = [head] if head else []
    link = _clean(buy_link)
    if link:
        lines.append(f"Buy or lease: {link}")
    facts = []
    if bpm:
        try:
            facts.append(f"BPM: {int(round(float(bpm)))}")
        except (TypeError, ValueError):
            pass
    if _clean(key):
        facts.append(f"Key: {_clean(key)}")
    if facts:
        lines.append(" | ".join(facts))

    paragraph_bits = []
    name_part = f'"{beat.title()}" is a' if beat else "A"
    style = f"{sound} " if sound and sound.lower() not in artist_clean.lower() else ""
    if artist_clean:
        paragraph_bits.append(f"{name_part} {style}{artist_clean} type beat.")
        paragraph_bits.append(f"Made for artists who want a {artist_clean} sound.")
    elif style:
        paragraph_bits.append(f"{name_part} {style.strip()} beat.")
    paragraph = " ".join(paragraph_bits)

    blocks: list[str] = ["\n".join(lines)] if lines else []
    if paragraph:
        blocks.append(paragraph)

    if include_chapters and chapters:
        valid, why_not = validate_chapters(chapters)
        if valid:
            blocks.append("\n".join(f"{format_timestamp(row['t'])} {row['label']}" for row in valid))
        elif why_not:
            warnings.append(why_not)

    template = str(template_text or "").strip()
    if template:
        blocks.append(template)

    hashtags = pick_hashtags(artist=artist_clean, tags=tag_list, top_keyword=sound)
    existing = count_hashtags(template)
    if existing + len(hashtags) > YOUTUBE_HASHTAG_LIMIT:
        warnings.append(
            f"Your template already has {existing} hashtags. Over {YOUTUBE_HASHTAG_LIMIT} in total and YouTube ignores all of them, so trim the template."
        )
    blocks.append(" ".join(hashtags))

    content = "\n\n".join(block for block in blocks if block)
    if "<" in content or ">" in content:
        content = content.replace("<", "").replace(">", "")
        warnings.append("Removed < and > (YouTube rejects descriptions that contain them).")

    if byte_length(content) > DESCRIPTION_MAX_BYTES:
        # Trim the template, which is the only long part, and keep the hashtags at the end.
        tail = "\n\n" + " ".join(hashtags)
        room = DESCRIPTION_MAX_BYTES - byte_length(tail)
        body = content[: -len(tail)] if content.endswith(tail) else content
        body = body.encode("utf-8")[:room].decode("utf-8", errors="ignore").rstrip()
        content = body + tail
        warnings.append(f"Shortened to fit YouTube's {DESCRIPTION_MAX_BYTES}-byte limit. Trim your template to keep its ending.")

    return {"content": content, "hashtags": hashtags, "bytes": byte_length(content), "warnings": warnings}
