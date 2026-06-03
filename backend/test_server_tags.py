import os
import sys
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path
from fastapi import HTTPException

# Add backend to sys.path to ensure imports work correctly
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

# Mock environment variables required by server.py
os.environ["MONGO_URL"] = "mongodb://mock:27017"
os.environ["JWT_SECRET_KEY"] = "mock_secret"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_EXPIRATION_MINUTES"] = "60"
os.environ["STRIPE_SECRET_KEY"] = "mock_stripe"
os.environ["STRIPE_PRICE_ID"] = "mock_price"
os.environ["OPENAI_API_KEY"] = "mock_openai_key"
os.environ["GROK_API_KEY"] = "mock_grok_key"

# Mock dependencies that run on import
with patch("motor.motor_asyncio.AsyncIOMotorClient"), \
     patch("stripe.api_key"):
    from backend.server import (
        generate_tags,
        TagGenerationRequest,
        update_tag_history,
        TagHistoryUpdateRequest,
        join_tags_ai,
        TagJoinRequest,
    )

def _mock_scored_entry(tag: str, score: int = 72) -> dict:
    return {
        "tag": tag,
        "score": score,
        "reason": "Strong YouTube demand proxy.",
        "breakdown": {
            "demand": 70.0,
            "competition": 75.0,
            "relevance": 68.0,
            "monthly_search_proxy": 120000,
            "total_results": 45000,
        },
        "source": "llm",
        "feedback_counts": {"kept": 0, "removed": 0},
    }


async def _mock_score_tags_with_youtube_proxy(**kwargs):
    tags_with_sources = kwargs.get("tags_with_sources") or []
    filtered = []
    for tag, _ in tags_with_sources:
        score = 25 if "deadquery" in tag.lower() else 72
        filtered.append(_mock_scored_entry(tag, score=score))
    return filtered, {"api_calls": 1, "cache_hits": 0, "candidates_scored": len(filtered)}


@pytest.mark.asyncio
async def test_generate_tags_success():
    """Test successful tag generation with valid inputs and sufficient credits."""
    # Mock dependencies
    mock_user = {"id": "user123", "username": "testuser", "_execute_inline": True}
    request_data = TagGenerationRequest(query="drake type beat", custom_tags=["custom1"])
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    with patch("backend.server._fetch_youtube_track_seeds_no_api", return_value=[]), \
         patch("backend.server._fetch_spotify_track_seeds", return_value=[]), \
         patch("backend.server._fetch_soundcloud_track_seeds", return_value=[]), \
         patch("backend.server._fetch_artist_context_from_youtube_api", return_value={
             "artist_name": "drake",
             "channel_found": False,
             "top_video_titles": [],
             "type_beat_search_results": ["drake type beat"],
             "is_likely_underground": False,
         }), \
         patch("backend.server.tag_metrics_service.score_tags_with_youtube_proxy", side_effect=_mock_score_tags_with_youtube_proxy), \
         patch("backend.server.llm_chat", new_callable=AsyncMock) as mock_llm_chat, \
         patch("backend.server.consume_credit", new_callable=AsyncMock) as mock_consume_credit, \
         patch("backend.server.db") as mock_db, \
         patch("backend.server.build") as mock_build:

        mock_db.users.find_one = AsyncMock(return_value={"id": "user123", "username": "testuser"})
        mock_db.tag_generations.find.return_value = mock_cursor
        mock_db.tag_generations.insert_one = AsyncMock()
        mock_db.growth_streaks.find_one = AsyncMock(return_value=None)
        mock_db.tag_keyword_cache = MagicMock()
        mock_db.tag_keyword_cache.find_one = AsyncMock(return_value=None)
        mock_db.tag_keyword_cache.update_one = AsyncMock()

        mock_llm_chat.return_value = '{"tags": ["drake type beat", "drake x future type beat"]}'

        response = await generate_tags(request_data, current_user=mock_user)

        assert response.user_id == "user123"
        assert response.query == "drake type beat"
        assert "drake type beat" in response.tags
        assert all(int(entry.get("score") or 0) >= 53 for entry in (response.scored_tags or []))

        mock_consume_credit.assert_called_once_with("user123")
        mock_db.tag_generations.insert_one.assert_called_once()
        mock_llm_chat.assert_called_once()


@pytest.mark.asyncio
async def test_generate_tags_drops_low_publish_score():
    """LLM tags below the publish score gate should not ship."""
    mock_user = {"id": "user123", "username": "testuser", "_execute_inline": True}
    request_data = TagGenerationRequest(query="drake type beat")
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    with patch("backend.server._fetch_youtube_track_seeds_no_api", return_value=[]), \
         patch("backend.server._fetch_spotify_track_seeds", return_value=[]), \
         patch("backend.server._fetch_soundcloud_track_seeds", return_value=[]), \
         patch("backend.server._fetch_artist_context_from_youtube_api", return_value={
             "artist_name": "drake",
             "channel_found": False,
             "top_video_titles": [],
             "type_beat_search_results": [],
             "is_likely_underground": False,
         }), \
         patch("backend.server.tag_metrics_service.score_tags_with_youtube_proxy", side_effect=_mock_score_tags_with_youtube_proxy), \
         patch("backend.server.llm_chat", new_callable=AsyncMock) as mock_llm_chat, \
         patch("backend.server.consume_credit", new_callable=AsyncMock), \
         patch("backend.server.db") as mock_db, \
         patch("backend.server.build"):

        mock_db.users.find_one = AsyncMock(return_value={"id": "user123", "username": "testuser"})
        mock_db.tag_generations.find.return_value = mock_cursor
        mock_db.tag_generations.insert_one = AsyncMock()
        mock_db.growth_streaks.find_one = AsyncMock(return_value=None)

        mock_llm_chat.return_value = '{"tags": ["deadquery type beat", "drake type beat"]}'

        response = await generate_tags(request_data, current_user=mock_user)

        assert "deadquery type beat" not in response.tags
        assert "drake type beat" in response.tags


@pytest.mark.asyncio
async def test_generate_tags_insufficient_credits():
    """Test that a 402 error is raised when user has insufficient credits."""
    mock_user = {"id": "user123", "username": "testuser"}
    request_data = TagGenerationRequest(query="test")

    with patch("backend.server.check_and_use_credit", new_callable=AsyncMock) as mock_check_credit, \
         patch("backend.server.get_user_subscription_status", new_callable=AsyncMock) as mock_get_status, \
         patch("backend.server.db") as mock_db: # Mock db just in case

        mock_check_credit.return_value = False
        mock_get_status.return_value = {"resets_at": "2024-01-01T00:00:00Z"}

        # Ensure db access doesn't crash if it happens before credit check (it shouldn't, but safe side)
        mock_db.users.find_one = AsyncMock(return_value={})

        with pytest.raises(HTTPException) as exc_info:
            await generate_tags(request_data, current_user=mock_user)

        assert exc_info.value.status_code == 402
        assert "Daily limit reached" in exc_info.value.detail["message"]


@pytest.mark.asyncio
async def test_generate_tags_invalid_provider():
    """Test that a 400 error is raised for an invalid LLM provider."""
    mock_user = {"id": "user123", "username": "testuser", "_execute_inline": True}
    request_data = TagGenerationRequest(query="test", llm_provider="invalid_provider")
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    with patch("backend.server.db") as mock_db:
        mock_db.users.find_one = AsyncMock(return_value={})
        mock_db.tag_generations.find.return_value = mock_cursor

        with pytest.raises(HTTPException) as exc_info:
            await generate_tags(request_data, current_user=mock_user)

        assert exc_info.value.status_code == 400
        assert "Invalid llm_provider" in exc_info.value.detail


@pytest.mark.asyncio
async def test_generate_tags_llm_failure():
    """Test that a 500 error is raised when the LLM service fails."""
    mock_user = {"id": "user123", "username": "testuser", "_execute_inline": True}
    request_data = TagGenerationRequest(query="test")
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    with patch("backend.server._fetch_youtube_track_seeds_no_api", return_value=[]), \
         patch("backend.server._fetch_spotify_track_seeds", return_value=[]), \
         patch("backend.server._fetch_soundcloud_track_seeds", return_value=[]), \
         patch("backend.server.llm_chat", new_callable=AsyncMock) as mock_llm_chat, \
         patch("backend.server.build") as mock_build, \
         patch("backend.server.db") as mock_db:
        mock_db.users.find_one = AsyncMock(return_value={})
        mock_db.tag_generations.find.return_value = mock_cursor

        mock_llm_chat.side_effect = Exception("LLM Error")

        with pytest.raises(HTTPException) as exc_info:
            await generate_tags(request_data, current_user=mock_user)

        assert exc_info.value.status_code == 500
        assert "Failed to generate tags" in exc_info.value.detail


@pytest.mark.asyncio
async def test_generate_tags_youtube_search_failure():
    """Test that tag generation continues even if YouTube search fails."""
    mock_user = {"id": "user123", "username": "testuser", "_execute_inline": True}
    request_data = TagGenerationRequest(query="drake type beat")
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    with patch("backend.server._fetch_youtube_track_seeds_no_api", return_value=[]), \
         patch("backend.server._fetch_spotify_track_seeds", return_value=[]), \
         patch("backend.server._fetch_soundcloud_track_seeds", return_value=[]), \
         patch("backend.server.llm_chat", new_callable=AsyncMock) as mock_llm_chat, \
         patch("backend.server.consume_credit", new_callable=AsyncMock) as mock_consume_credit, \
         patch("backend.server.db") as mock_db, \
         patch("backend.server.build") as mock_build:
        mock_db.users.find_one = AsyncMock(return_value={})
        mock_db.tag_generations.find.return_value = mock_cursor
        mock_db.tag_generations.insert_one = AsyncMock()
        mock_db.growth_streaks.find_one = AsyncMock(return_value=None)

        # Mock YouTube build to raise exception
        mock_build.side_effect = Exception("YouTube API Error")

        # Mock LLM to return valid tags
        mock_llm_chat.return_value = '{"tags": ["tag1", "tag2"]}'

        response = await generate_tags(request_data, current_user=mock_user)

        assert response.query == "drake type beat"
        assert "tag1" in response.tags
        # Verify LLM was still called despite YouTube failure
        mock_llm_chat.assert_called_once()


@pytest.mark.asyncio
async def test_generate_tags_prompt_flags_underground_artist_context():
    mock_user = {"id": "user123", "username": "testuser", "_execute_inline": True}
    request_data = TagGenerationRequest(query="slayr type beat")
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    with patch("backend.server._fetch_artist_context_from_youtube_api", return_value={
        "artist_name": "slayr",
        "channel_found": False,
        "channel_title": None,
        "top_video_titles": [],
        "type_beat_search_results": [],
        "is_likely_underground": True,
    }), \
         patch("backend.server._fetch_spotify_track_seeds", return_value=[]), \
         patch("backend.server._fetch_soundcloud_track_seeds", return_value=[]), \
         patch("backend.server.llm_chat", new_callable=AsyncMock) as mock_llm_chat, \
         patch("backend.server.consume_credit", new_callable=AsyncMock), \
         patch("backend.server.db") as mock_db, \
         patch("backend.server.build") as mock_build:
        mock_db.users.find_one = AsyncMock(return_value={})
        mock_db.tag_generations.find.return_value = mock_cursor
        mock_db.tag_generations.insert_one = AsyncMock()
        mock_db.growth_streaks.find_one = AsyncMock(return_value=None)
        mock_build.return_value = MagicMock()
        mock_llm_chat.return_value = '{"tags": ["slayr type beat", "underground rage type beat"]}'

        await generate_tags(request_data, current_user=mock_user)

        prompt = mock_llm_chat.await_args.kwargs["user_message"]
        assert 'Do NOT default to mainstream artists with similar names' in prompt
        assert '"slayr" appears to be underground' in prompt


@pytest.mark.asyncio
async def test_generate_tags_excludes_previously_removed_tags():
    mock_user = {"id": "user123", "username": "testuser", "_execute_inline": True}
    request_data = TagGenerationRequest(query="drake type beat")

    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[{"excluded_tags": ["tag2"]}])

    with patch("backend.server._fetch_youtube_track_seeds_no_api", return_value=[]), \
         patch("backend.server._fetch_spotify_track_seeds", return_value=[]), \
         patch("backend.server._fetch_soundcloud_track_seeds", return_value=[]), \
         patch("backend.server.consume_credit", new_callable=AsyncMock) as mock_consume_credit, \
         patch("backend.server.llm_chat", new_callable=AsyncMock) as mock_llm_chat, \
         patch("backend.server.db") as mock_db, \
         patch("backend.server.build") as mock_build:

        mock_db.users.find_one = AsyncMock(return_value={})
        mock_db.tag_generations.find.return_value = mock_cursor
        mock_db.tag_generations.insert_one = AsyncMock()
        mock_db.growth_streaks.find_one = AsyncMock(return_value=None)
        mock_llm_chat.return_value = '{"tags": ["tag1", "tag2", "tag3"]}'
        mock_build.side_effect = Exception("YouTube API Error")

        response = await generate_tags(request_data, current_user=mock_user)

        assert "tag2" not in response.tags
        assert "tag1" in response.tags
        assert "tag3" in response.tags
        mock_consume_credit.assert_awaited_once_with("user123")


@pytest.mark.asyncio
async def test_update_tag_history_tracks_removed_tags():
    mock_user = {"id": "user123", "username": "testuser"}
    request_data = TagHistoryUpdateRequest(tags=["tag1", "tag3"], excluded_tags=["tag2"])
    existing_doc = {
        "id": "tag-history-1",
        "user_id": "user123",
        "query": "drake type beat",
        "tags": ["tag1", "tag2", "tag3"],
        "excluded_tags": [],
        "created_at": "2026-03-12T12:00:00+00:00",
    }
    updated_doc = {
        **existing_doc,
        "tags": ["tag1", "tag3"],
        "excluded_tags": ["tag2"],
    }

    with patch("backend.server.db") as mock_db:
        mock_db.tag_generations.find_one = AsyncMock(side_effect=[existing_doc, updated_doc])
        mock_db.tag_generations.update_one = AsyncMock()
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[])
        mock_db.tag_generations.find.return_value = mock_cursor

        response = await update_tag_history("tag-history-1", request_data, current_user=mock_user)

        assert response.tags == ["tag1", "tag3"]
        assert response.excluded_tags == ["tag2"]
        mock_db.tag_generations.update_one.assert_awaited_once()


@pytest.mark.asyncio
async def test_join_tags_ai_enriches_and_filters_excluded_tags():
    mock_user = {"id": "user123", "username": "testuser", "_execute_inline": True}
    request_data = TagJoinRequest(
        queries=["drake type beat", "future type beat"],
        candidate_tags=["drake type beat", "future type beat", "dark trap beat"],
        max_tags=30,
    )

    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[{"excluded_tags": ["dark trap beat"]}])

    with patch("backend.server._ensure_pro_user", new_callable=AsyncMock) as mock_ensure_pro, \
         patch("backend.server.consume_credit", new_callable=AsyncMock) as mock_consume_credit, \
         patch("backend.server._collect_join_source_candidates", new_callable=AsyncMock) as mock_collect, \
         patch("backend.server.llm_chat", new_callable=AsyncMock) as mock_llm_chat, \
         patch("backend.server.db") as mock_db:

        mock_db.tag_generations.find.return_value = mock_cursor
        mock_collect.return_value = (
            ["drake x future type beat", "monster type beat", "future drake type beat"],
            {
                "drake x future type beat": "youtube_titles",
                "monster type beat": "youtube_tracks",
                "future drake type beat": "query_combo",
            },
            {"drake:youtube_titles": "ok"},
        )
        mock_llm_chat.return_value = json.dumps({
            "tags": [
                "drake x future type beat",
                "dark trap beat",
                "monster type beat",
                "future drake type beat",
            ]
        })

        response = await join_tags_ai(request_data, current_user=mock_user)

        assert "drake x future type beat" in response.tags
        assert "monster type beat" in response.tags
        assert "dark trap beat" not in response.tags
        mock_ensure_pro.assert_awaited_once()
        mock_consume_credit.assert_awaited_once_with("user123")
