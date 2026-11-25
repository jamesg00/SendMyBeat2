"""Unit tests for blending the model's relevance judgement into tag scores."""

import sys
from pathlib import Path

backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

from services.tag_metrics import (
    TAG_SCORE_RELEVANCE_WEIGHT,
    apply_llm_relevance,
    parse_llm_relevance,
)


def _entry(score=70, relevance=80.0):
    return {
        "tag": "drake type beat",
        "score": score,
        "breakdown": {"demand": 90.0, "competition": 40.0, "relevance": relevance, "demand_source": "autocomplete"},
        "signals": {},
        "source": "youtube",
    }


def test_parse_reads_dict_and_list_forms():
    assert parse_llm_relevance({"relevance": {"Drake  Type Beat": 20, "opium type beat": "95"}}) == {
        "drake type beat": 20.0,
        "opium type beat": 95.0,
    }
    assert parse_llm_relevance({"relevance": [{"tag": "a b", "relevance": 150}, {"tag": "c", "score": -5}]}) == {
        "a b": 100.0,
        "c": 0.0,
    }


def test_parse_skips_junk():
    assert parse_llm_relevance({"tags": ["x"]}) == {}
    assert parse_llm_relevance(["x"]) == {}
    assert parse_llm_relevance({"relevance": {"x": "high", "y": None, "z": True, "": 50}}) == {}


def test_wrong_fit_tag_drops_and_good_fit_rises():
    low = apply_llm_relevance(_entry(), 0, blend=0.6)
    expected_drop = TAG_SCORE_RELEVANCE_WEIGHT * (0.4 * 80 - 80)
    assert low["score"] == round(70 + expected_drop)
    assert low["breakdown"]["llm_relevance"] == 0.0
    assert low["breakdown"]["heuristic_relevance"] == 80.0
    assert low["breakdown"]["demand"] == 90.0

    high = apply_llm_relevance(_entry(score=60, relevance=50.0), 100, blend=0.6)
    assert high["score"] > 60


def test_applying_twice_does_not_compound():
    once = apply_llm_relevance(_entry(), 10, blend=0.6)
    twice = apply_llm_relevance(once, 10, blend=0.6)
    assert twice["score"] == once["score"]
    assert twice["breakdown"]["relevance"] == once["breakdown"]["relevance"]


def test_entry_without_relevance_is_left_alone():
    entry = {"tag": "x", "score": 55, "breakdown": {}}
    assert apply_llm_relevance(entry, 0) is entry
