"""Unit tests for YouTube-proxy tag scoring."""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

from services.tag_metrics import (
    TAG_MIN_PUBLISH_SCORE,
    build_artist_nest_candidates,
    compute_composite_tag_score,
    filter_scored_tags_by_threshold,
    normalize_competition_score,
    normalize_demand_score,
    fetch_tag_youtube_metrics,
)


def test_normalize_demand_increases_with_views():
    low = normalize_demand_score(500)
    high = normalize_demand_score(500_000)
    assert high > low


def test_normalize_competition_sweet_spot():
    dead = normalize_competition_score(50)
    sweet = normalize_competition_score(50_000)
    saturated = normalize_competition_score(5_000_000)
    assert sweet > dead
    assert sweet > saturated


def test_composite_score_weights():
    metrics = {"median_views": 250_000, "total_results": 80_000}
    result = compute_composite_tag_score(metrics=metrics, relevance_score=80)
    assert 1 <= result["score"] <= 100
    assert result["demand"] > 40
    assert result["competition"] > 40
    assert result["relevance"] == 80.0


def test_composite_zero_views_low_score():
    metrics = {"median_views": 0, "total_results": 0}
    result = compute_composite_tag_score(metrics=metrics, relevance_score=90)
    assert result["score"] < TAG_MIN_PUBLISH_SCORE


def test_filter_relaxed_threshold_for_underground():
    scored = [
        {"tag": f"tag{i}", "score": 55}
        for i in range(20)
    ]
    tags, passed, effective = filter_scored_tags_by_threshold(scored, min_score=58)
    assert effective == 53
    assert len(tags) == 20
    assert len(passed) == 20


def test_filter_keeps_strict_when_enough_tags():
    scored = [{"tag": f"tag{i}", "score": 65} for i in range(20)]
    tags, passed, effective = filter_scored_tags_by_threshold(scored, min_score=58)
    assert effective == 58
    assert len(tags) == 20


def test_build_artist_nest_candidates():
    out = build_artist_nest_candidates("drake", ["drake x future type beat"])
    assert "drake type beat" in [t.lower() for t in out]
    assert any("future" in t.lower() for t in out)


def test_fetch_tag_youtube_metrics_aggregates_views():
    youtube = MagicMock()
    search_execute = MagicMock(
        return_value={
            "pageInfo": {"totalResults": 12000},
            "items": [
                {"id": {"videoId": "a"}, "snippet": {"title": "Artist type beat"}},
                {"id": {"videoId": "b"}, "snippet": {"title": "Artist type beat 2"}},
            ],
        }
    )
    videos_execute = MagicMock(
        return_value={
            "items": [
                {"statistics": {"viewCount": "100000"}, "snippet": {"title": "A"}},
                {"statistics": {"viewCount": "200000"}, "snippet": {"title": "B"}},
            ]
        }
    )
    youtube.search.return_value.list.return_value.execute = search_execute
    youtube.videos.return_value.list.return_value.execute = videos_execute

    metrics = fetch_tag_youtube_metrics(youtube, "drake type beat")
    assert metrics["total_results"] == 12000
    assert metrics["median_views"] == 150000
    assert len(metrics["top_titles"]) >= 1
