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
    from backend.server import generate_tags, TagGenerationRequest

@pytest.mark.asyncio
async def test_generate_tags_success():
    """Test successful tag generation with valid inputs and sufficient credits."""
    # Mock dependencies
    mock_user = {"id": "user123", "username": "testuser"}
    request_data = TagGenerationRequest(query="drake type beat", custom_tags=["custom1"])

    with patch("backend.server.check_and_use_credit", new_callable=AsyncMock) as mock_check_credit, \
         patch("backend.server.llm_chat", new_callable=AsyncMock) as mock_llm_chat, \
         patch("backend.server.consume_credit", new_callable=AsyncMock) as mock_consume_credit, \
         patch("backend.server.db") as mock_db, \
         patch("backend.server.build") as mock_build:  # Mock Google API build

        # Setup mocks
        mock_check_credit.return_value = True

        # Mock DB calls
        mock_db.users.find_one = AsyncMock(return_value={"id": "user123", "username": "testuser"})
        mock_db.tag_generations.insert_one = AsyncMock()
        mock_db.growth_streaks.find_one = AsyncMock(return_value=None)

        # Mock LLM response to return a JSON string
        mock_llm_chat.return_value = '{"tags": ["tag1", "tag2", "tag3"]}'

        # Call the function
        response = await generate_tags(request_data, current_user=mock_user)

        # Assertions
        assert response.user_id == "user123"
        assert response.query == "drake type beat"
        assert "tag1" in response.tags

        mock_check_credit.assert_called_once_with("user123", consume=False)
        mock_consume_credit.assert_called_once_with("user123")
        mock_db.tag_generations.insert_one.assert_called_once()
        mock_llm_chat.assert_called_once()


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
    mock_user = {"id": "user123", "username": "testuser"}
    request_data = TagGenerationRequest(query="test", llm_provider="invalid_provider")

    with patch("backend.server.check_and_use_credit", new_callable=AsyncMock) as mock_check_credit, \
         patch("backend.server.db") as mock_db:

        mock_check_credit.return_value = True
        mock_db.users.find_one = AsyncMock(return_value={})

        with pytest.raises(HTTPException) as exc_info:
            await generate_tags(request_data, current_user=mock_user)

        assert exc_info.value.status_code == 400
        assert "Invalid llm_provider" in exc_info.value.detail


@pytest.mark.asyncio
async def test_generate_tags_llm_failure():
    """Test that a 500 error is raised when the LLM service fails."""
    mock_user = {"id": "user123", "username": "testuser"}
    request_data = TagGenerationRequest(query="test")

    with patch("backend.server.check_and_use_credit", new_callable=AsyncMock) as mock_check_credit, \
         patch("backend.server.llm_chat", new_callable=AsyncMock) as mock_llm_chat, \
         patch("backend.server.build") as mock_build, \
         patch("backend.server.db") as mock_db:

        mock_check_credit.return_value = True
        mock_db.users.find_one = AsyncMock(return_value={})

        mock_llm_chat.side_effect = Exception("LLM Error")

        with pytest.raises(HTTPException) as exc_info:
            await generate_tags(request_data, current_user=mock_user)

        assert exc_info.value.status_code == 500
        assert "Failed to generate tags" in exc_info.value.detail


@pytest.mark.asyncio
async def test_generate_tags_youtube_search_failure():
    """Test that tag generation continues even if YouTube search fails."""
    mock_user = {"id": "user123", "username": "testuser"}
    request_data = TagGenerationRequest(query="drake type beat")

    with patch("backend.server.check_and_use_credit", new_callable=AsyncMock) as mock_check_credit, \
         patch("backend.server.llm_chat", new_callable=AsyncMock) as mock_llm_chat, \
         patch("backend.server.consume_credit", new_callable=AsyncMock) as mock_consume_credit, \
         patch("backend.server.db") as mock_db, \
         patch("backend.server.build") as mock_build:

        mock_check_credit.return_value = True
        mock_db.users.find_one = AsyncMock(return_value={})
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
