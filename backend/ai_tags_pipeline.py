# ai_tags_pipeline.py
import os
import re
import json
import math
import html
import asyncio
import logging
from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple, Set
import aiohttp

# ------------------------------- Constants -------------------------------- #

POWER_TERMS = {
    "type beat", "instrumental", "beat", "free", "free for profit",
    "hard", "dark", "melodic", "with hook", "aggressive"
}
CURRENT_YEARS = {"2025", "2024"}

TAG_CHAR_BUDGET = 495  # Use almost full 500-char limit
MIN_TAG_COUNT = 25  # Minimum number of tags to generate

# ---------------------------- Utility functions --------------------------- #

def _tokenize(s: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", s.lower())

def _jaccard(a: Set[str], b: Set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0

def _trim_jsonp(text: str) -> str:
    # YouTube suggest returns: google.sbox.pXX([...])
    i = text.find('[')
    j = text.rfind(']')
    if i != -1 and j != -1 and j > i:
        return text[i:j+1]
    return text

def _normalize_tag(tag: str) -> str:
    # Keep only safe chars YouTube typically accepts in tags
    tag = html.unescape(tag)
    tag = re.sub(r"\s+", " ", tag.strip())
    # Avoid excessive punctuation / emojis
    tag = re.sub(r"[^a-zA-Z0-9\s\-\'&/+#]", "", tag)
    # Basic collapse
    return re.sub(r"\s{2,}", " ", tag).strip()

def _looks_spammy(tag: str) -> bool:
    # Reject obvious slop: repeated words, very long length, or empty
    if not tag or len(tag) > 80:  # Allow longer tags
        return True
    words = tag.lower().split()
    if len(words) != len(set(words)) and len(words) > 5:  # Less strict on repetition
        # repeated word pattern (e.g., "beat beat beat")
        return True
    # Avoid meaningless strings
    if re.fullmatch(r"[a-z0-9\s\-\'&/+#]+", tag) is None:
        return True
    return False

# ------------------------------- Data model -------------------------------- #

@dataclass
class TagCandidate:
    text: str
    source: str  # "llm", "yt_suggest", "template"
    category: Optional[str] = None  # optional taxonomy from LLM
    score: float = 0.0

# ------------------------ Autocomplete (undocumented) ---------------------- #

async def fetch_youtube_suggestions(query: str, lang: str = "en") -> List[str]:
    """Fetch YouTube autocomplete suggestions for a query"""
    url = "https://clients1.google.com/complete/search"
    params = {"client": "youtube", "ds": "yt", "q": query, "hl": lang}
    timeout = aiohttp.ClientTimeout(total=5)
    
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, params=params) as resp:
                text = await resp.text()
        
        payload = json.loads(_trim_jsonp(text))
        # payload structure: [ "<original>", [ ["suggestion", ...], ...], {...} ]
        raw = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
        suggestions = [row[0] for row in raw if isinstance(row, list) and row]
        return [_normalize_tag(s) for s in suggestions if _normalize_tag(s)]
    except Exception as e:
        logging.warning(f"Failed to fetch YouTube suggestions: {e}")
        return []

# -------------------------- LLM candidate generation ------------------------ #

def build_llm_system_message() -> str:
    return """You are a YouTube SEO expert specializing in music beat discovery optimization.
Return rigorous, realistic tags (no spam). Think about misspellings, artist variants,
genre+mood+tempo, and real searcher language. Output strict JSON only."""

def build_llm_user_prompt(query: str) -> str:
    return f"""Task: Propose up to 120 realistic YouTube tag candidates for: "{query}".

Rules:
- Tags must sound like what people actually type.
- Include a balanced mix:
  * most_searched (<= 40%)
  * ctr_drivers (<= 30%)
  * long_tail (<= 25%)
  * algo_favorites (<= 15%)
- Keep short tags common; allow longer tags only in long_tail.
- Include some artist misspellings/variants if relevant.
- Allow only ASCII letters, numbers, spaces, hyphen, apostrophe, slash, ampersand, plus.
- No duplicates. No explanations.

Return STRICT JSON in this schema:
{{
  "candidates": [
    {{"text": "drake type beat", "category": "most_searched"}},
    {{"text": "hard trap instrumental 2025", "category": "ctr_drivers"}}
  ]
}}"""

async def llm_candidates(chat, query: str) -> List[TagCandidate]:
    """Get structured tag candidates from LLM"""
    system_msg = build_llm_system_message()
    prompt = build_llm_user_prompt(query)
    text = ""  # Initialize to avoid UnboundLocalError
    
    try:
        # Update system message
        chat.system_message = system_msg
        
        # Send message
        from emergentintegrations import UserMessage
        user_msg = UserMessage(text=prompt)
        resp = await chat.send_message(user_msg)
        text = resp.strip()
        
        # Extract JSON if wrapped in markdown
        m = re.search(r"\{.*\}", text, flags=re.S)
        json_str = m.group(0) if m else text
        
        data = json.loads(json_str)
        out: List[TagCandidate] = []
        for item in data.get("candidates", []):
            t = _normalize_tag(str(item.get("text", "")))
            if t:
                out.append(TagCandidate(text=t, category=item.get("category"), source="llm"))
        return out
    except Exception as e:
        logging.warning(f"LLM JSON parsing failed, using fallback: {e}")
        # Permissive fallback: split commas/newlines if we have text
        if text:
            fallback = [TagCandidate(text=_normalize_tag(t), source="llm")
                        for t in re.split(r"[,\n]", text)]
            return [c for c in fallback if c.text][:100]
        else:
            # Return empty list if no text available
            logging.error("No text available from LLM, returning empty list")
            return []

# ---------------------- Template expansion (cheap signal) ------------------- #

def template_candidates(query: str) -> List[TagCandidate]:
    """Generate template-based candidates"""
    q_norm = _normalize_tag(query)
    bases = {
        f"{q_norm} type beat", f"{q_norm} instrumental", f"hard {q_norm} type beat",
        f"dark {q_norm} type beat", f"melodic {q_norm} instrumental",
        f"free {q_norm} type beat", f"{q_norm} type beat 2025",
        f"{q_norm} beat", f"{q_norm} sample", f"{q_norm} freestyle beat",
        f"{q_norm} type beat with hook", f"{q_norm} free for profit"
    }
    out = []
    for b in bases:
        t = _normalize_tag(b)
        if t:
            out.append(TagCandidate(text=t, source="template"))
    return out

# ------------------------ Scoring & selection logic ------------------------ #

def score_candidate(c: TagCandidate,
                    query_tokens: Set[str],
                    yt_suggest_set: Set[str]) -> float:
    """Score a tag candidate based on multiple factors"""
    t = c.text.lower()

    # Base similarity to query via token Jaccard
    cand_tokens = set(_tokenize(t))
    sim = _jaccard(query_tokens, cand_tokens)  # 0..1

    # Presence in live suggestions: big boost
    in_suggest = (t in yt_suggest_set)

    # Power terms & years
    power_hits = sum(1 for w in POWER_TERMS if w in t)
    year_hits = sum(1 for y in CURRENT_YEARS if y in t)

    # Length penalty - Less aggressive
    word_count = len(t.split())
    long_pen = 0.0
    if word_count >= 10:
        long_pen = 0.10
    elif word_count >= 12:
        long_pen = 0.20

    # Spammy penalty
    spam_pen = 0.25 if _looks_spammy(c.text) else 0.0

    score = (
        0.6 * sim +
        (0.9 if in_suggest else 0.0) +
        0.05 * power_hits +
        0.03 * year_hits -
        long_pen -
        spam_pen
    )

    # Slight source weighting
    if c.source == "yt_suggest":
        score += 0.25
    elif c.source == "template":
        score += 0.05

    return max(score, 0.0)

def mmr_diverse_select(cands: List[TagCandidate],
                       lambda_div: float = 0.75,
                       char_budget: int = TAG_CHAR_BUDGET) -> List[str]:
    """
    Greedy MMR: balance top score with dissimilarity to selected.
    Stop when we hit char_budget (sum of tag lengths + commas).
    """
    # Sort by score desc
    pool = sorted(cands, key=lambda c: c.score, reverse=True)

    selected: List[TagCandidate] = []
    selected_tokens: List[Set[str]] = []
    used: Set[str] = set()

    def redundancy(c: TagCandidate) -> float:
        ctoks = set(_tokenize(c.text))
        if not selected_tokens:
            return 0.0
        return max(_jaccard(ctoks, st) for st in selected_tokens)

    # Char accounting includes commas
    total_chars = 0

    while pool and total_chars < char_budget:
        # Compute MMR for top subset for speed
        topk = pool[:120]
        mmr_vals: List[Tuple[float, int]] = []
        for idx, c in enumerate(topk):
            if c.text.lower() in used:
                continue
            r = redundancy(c)
            mmr = lambda_div * c.score - (1.0 - lambda_div) * r
            mmr_vals.append((mmr, idx))
        if not mmr_vals:
            break
        mmr_vals.sort(reverse=True, key=lambda x: x[0])
        _, pick_idx = mmr_vals[0]
        c = topk[pick_idx]

        # Check char budget (include comma if not first)
        add_len = len(c.text) + (1 if selected else 0)
        if total_chars + add_len > char_budget:
            # try next best
            pool.pop(pick_idx)
            continue

        # accept
        selected.append(c)
        selected_tokens.append(set(_tokenize(c.text)))
        used.add(c.text.lower())
        total_chars += add_len

        # remove from pool
        pool.pop(pick_idx)

    return [s.text for s in selected]

# ---------------------------- Orchestrator --------------------------------- #

async def generate_smart_tags(query: str, chat) -> List[str]:
    """
    Main orchestrator: fetch suggestions, get LLM candidates, score, select.
    Returns ~20-35 tags that fit within 500-character limit.
    """
    query_tokens = set(_tokenize(query))

    # 1) Live YouTube suggestions
    yt_suggest = await fetch_youtube_suggestions(query)
    yt_suggest_set = {s.lower() for s in yt_suggest}
    logging.info(f"Fetched {len(yt_suggest)} YouTube suggestions for: {query}")

    # 2) LLM structured candidates
    llm = await llm_candidates(chat, query)
    logging.info(f"Got {len(llm)} LLM candidates")

    # 3) Cheap templates
    templ = template_candidates(query)
    logging.info(f"Generated {len(templ)} template candidates")

    # Merge and normalize, unique by lowercase
    merged: Dict[str, TagCandidate] = {}
    for src_list in (llm, templ):
        for c in src_list:
            t = _normalize_tag(c.text)
            if not t or _looks_spammy(t):
                continue
            key = t.lower()
            if key not in merged:
                merged[key] = TagCandidate(text=t, source=c.source, category=c.category)

    # Add YouTube suggestions
    for s in yt_suggest:
        key = s.lower()
        if key not in merged:
            merged[key] = TagCandidate(text=s, source="yt_suggest")

    # Score all candidates
    for c in merged.values():
        c.score = score_candidate(c, query_tokens, yt_suggest_set)

    # Select diversely under 500-char budget
    ranked = list(merged.values())
    final_tags = mmr_diverse_select(ranked, lambda_div=0.78, char_budget=TAG_CHAR_BUDGET)

    logging.info(f"Selected {len(final_tags)} tags, total chars: {sum(len(t) for t in final_tags) + len(final_tags) - 1}")

    return final_tags
