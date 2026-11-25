"""Title checks: what makes a type-beat title work, scored without AI or quota."""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from services.tag_titles import (  # noqa: E402
    YOUTUBE_TITLE_LIMIT,
    score_title,
    suggest_titles,
    top_sound_keyword,
)

RUN = [
    {"tag": "future type beat", "score": 90},
    {"tag": "dark trap", "score": 70},
    {"tag": "future x gunna type beat", "score": 65},
    {"tag": "ambient", "score": 40},
]


def _checks(result):
    return {check["id"]: check for check in result["checks"]}


def test_a_well_built_title_passes_every_check():
    result = score_title('Future Type Beat - "NEON" | Dark Trap', artist="future", top_keyword="dark trap")
    assert all(check["ok"] for check in result["checks"]), result["checks"]
    assert result["score"] == 100


def test_artist_first_needs_artist_and_type_beat_early():
    late = score_title('Dark melodic instrumental for rappers 2026 "NEON" - Future Type Beat', artist="future")
    assert _checks(late)["artist_first"]["ok"] is False
    early = score_title('Future Type Beat - "NEON"', artist="future")
    assert _checks(early)["artist_first"]["ok"] is True


def test_length_check_counts_to_youtubes_limit():
    ok = score_title('Future Type Beat - "NEON"', artist="future")
    assert _checks(ok)["length"]["message"] == f"25 of {YOUTUBE_TITLE_LIMIT} characters"
    long_title = 'Future Type Beat - "NEON" ' + "x" * 90
    over = score_title(long_title, artist="future")
    assert _checks(over)["length"]["ok"] is False
    assert over["score"] <= 40  # YouTube wouldn't accept it


def test_angle_brackets_are_rejected():
    result = score_title('Future Type Beat - "<NEON>"', artist="future")
    assert _checks(result)["characters"]["ok"] is False
    assert result["score"] <= 40


def test_top_keyword_check_names_the_keyword():
    result = score_title('Future Type Beat - "NEON"', artist="future", top_keyword="dark trap")
    check = _checks(result)["top_keyword"]
    assert check["ok"] is False and "dark trap" in check["message"]


def test_checks_that_need_a_run_are_skipped_without_one():
    result = score_title('Future Type Beat - "NEON"')
    ids = _checks(result)
    assert "top_keyword" not in ids
    assert ids["artist_first"]["ok"] is True  # 'type beat' leads, artist unknown


def test_empty_title_scores_zero():
    assert score_title("   ")["score"] == 0


def test_top_sound_keyword_is_the_best_genre_tag():
    assert top_sound_keyword(artist="future", scored_tags=RUN) == "dark trap"


def test_suggestions_carry_a_score_and_what_they_cover():
    titles = suggest_titles(artist="future", scored_tags=RUN, beat_name="neon", year=2026)
    assert titles
    for item in titles:
        assert 0 <= item["score"] <= 100
        assert item["covers"] == item["keywords"]
