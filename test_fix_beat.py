import unittest
import sys
import os
import json
from unittest.mock import patch, MagicMock, AsyncMock

# Add backend directory to sys.path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Mock environment variables BEFORE importing server
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['JWT_SECRET_KEY'] = 'test_secret'
os.environ['JWT_ALGORITHM'] = 'HS256'
os.environ['JWT_EXPIRATION_MINUTES'] = '60'
os.environ['STRIPE_SECRET_KEY'] = 'test_stripe_key'
os.environ['STRIPE_PRICE_ID'] = 'test_price_id'

# Mock motor to prevent DB connection
sys.modules['motor'] = MagicMock()
sys.modules['motor.motor_asyncio'] = MagicMock()

# Import server as 'server' module
import server

from fastapi import HTTPException

class TestFixBeat(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        # Patch dependencies on the 'server' module directly
        self.check_credit_patcher = patch('server.check_and_use_credit', new_callable=AsyncMock)
        self.check_credit_mock = self.check_credit_patcher.start()

        self.consume_credit_patcher = patch('server.consume_credit', new_callable=AsyncMock)
        self.consume_credit_mock = self.consume_credit_patcher.start()

        self.llm_chat_patcher = patch('server.llm_chat', new_callable=AsyncMock)
        self.llm_chat_mock = self.llm_chat_patcher.start()

        self.get_sub_status_patcher = patch('server.get_user_subscription_status', new_callable=AsyncMock)
        self.get_sub_status_mock = self.get_sub_status_patcher.start()

    async def asyncTearDown(self):
        self.check_credit_patcher.stop()
        self.consume_credit_patcher.stop()
        self.llm_chat_patcher.stop()
        self.get_sub_status_patcher.stop()

    async def test_fix_beat_no_fix_needed(self):
        """Test fix_beat when analysis scores are high (no fix needed)"""
        # Arrange
        self.check_credit_mock.return_value = True

        # Mock analysis response
        analysis = MagicMock()
        analysis.title_score = 90
        analysis.tags_score = 90
        analysis.weaknesses = []
        analysis.suggestions = []

        # Use simple object or mock for request to avoid pydantic validation complexity if possible
        # But server uses Pydantic models, so let's use them if possible.
        # Since we imported server, we can use server.BeatFixRequest
        request = server.BeatFixRequest(
            title="Good Title",
            tags=["tag1", "tag2"],
            description="Good description",
            analysis=server.BeatAnalysisResponse(
                overall_score=90,
                title_score=90,
                tags_score=90,
                seo_score=90,
                strengths=["Good"],
                weaknesses=[],
                suggestions=[],
                predicted_performance="Excellent"
            )
        )
        current_user = {"id": "user123"}

        # Act
        response = await server.fix_beat(request, current_user)

        # Assert
        self.assertEqual(response.title, "Good Title")
        self.assertEqual(response.tags, ["tag1", "tag2"])
        self.assertEqual(response.description, "Good description")
        self.assertEqual(response.applied_fixes, {"title": False, "tags": False, "description": False})
        self.assertEqual(response.notes, "No critical issues detected. No fixes applied.")

        # Verify LLM was NOT called
        self.llm_chat_mock.assert_not_called()
        # Verify credit was checked but not consumed (consume=False in check_and_use_credit)
        self.check_credit_mock.assert_called_once_with("user123", consume=False)
        # Verify explicit consume_credit was NOT called (because no fix applied)
        self.consume_credit_mock.assert_not_called()

    async def test_fix_beat_fix_needed(self):
        """Test fix_beat when analysis scores are low (fix needed)"""
        # Arrange
        self.check_credit_mock.return_value = True

        # Mock LLM response
        fixed_data = {
            "title": "Better Title",
            "tags": ["better", "tags"],
            "description": "Better description",
            "applied_fixes": {"title": True, "tags": True, "description": True},
            "notes": "Fixed everything"
        }
        self.llm_chat_mock.return_value = json.dumps(fixed_data)

        request = server.BeatFixRequest(
            title="Bad Title",
            tags=["bad"],
            description="",
            analysis=server.BeatAnalysisResponse(
                overall_score=50,
                title_score=50,
                tags_score=50,
                seo_score=50,
                strengths=[],
                weaknesses=["Bad title", "Bad tags"],
                suggestions=["Fix title"],
                predicted_performance="Poor"
            )
        )
        current_user = {"id": "user123"}

        # Act
        response = await server.fix_beat(request, current_user)

        # Assert
        self.assertEqual(response.title, "Better Title")
        self.assertEqual(response.tags, ["better", "tags"])
        self.assertEqual(response.description, "Better description")
        self.assertEqual(response.applied_fixes, {"title": True, "tags": True, "description": True})
        self.assertEqual(response.notes, "Fixed everything")

        # Verify LLM was called
        self.llm_chat_mock.assert_called_once()
        # Verify consume_credit was called
        self.consume_credit_mock.assert_called_once_with("user123")

    async def test_fix_beat_insufficient_credit(self):
        """Test fix_beat when user has insufficient credits"""
        # Arrange
        self.check_credit_mock.return_value = False
        self.get_sub_status_mock.return_value = {"resets_at": "tomorrow"}

        request = server.BeatFixRequest(
            title="Title",
            tags=[],
            description="",
            analysis=server.BeatAnalysisResponse(
                overall_score=50,
                title_score=50,
                tags_score=50,
                seo_score=50,
                strengths=[],
                weaknesses=[],
                suggestions=[],
                predicted_performance="Average"
            )
        )
        current_user = {"id": "user123"}

        # Act & Assert
        with self.assertRaises(HTTPException) as cm:
            await server.fix_beat(request, current_user)

        self.assertEqual(cm.exception.status_code, 402)
        self.assertEqual(cm.exception.detail["message"], "Daily limit reached. Upgrade to Pro for unlimited fixes!")

    async def test_fix_beat_llm_failure(self):
        """Test fix_beat when LLM fails or returns invalid JSON"""
        # Arrange
        self.check_credit_mock.return_value = True
        self.llm_chat_mock.side_effect = Exception("LLM Error")

        request = server.BeatFixRequest(
            title="Bad Title",
            tags=["bad"],
            description="",
            analysis=server.BeatAnalysisResponse(
                overall_score=50,
                title_score=50,
                tags_score=50,
                seo_score=50,
                strengths=[],
                weaknesses=["Bad"],
                suggestions=["Fix"],
                predicted_performance="Poor"
            )
        )
        current_user = {"id": "user123"}

        # Act
        response = await server.fix_beat(request, current_user)

        # Assert fallback behavior
        self.assertEqual(response.title, "Bad Title")
        self.assertEqual(response.tags, ["bad"])
        self.assertEqual(response.description, "")
        self.assertEqual(response.applied_fixes, {"title": False, "tags": False, "description": False})
        self.assertEqual(response.notes, "Failed to apply fixes. Please try again.")

        # Verify credit was consumed (as per current implementation catch block)
        self.consume_credit_mock.assert_called_once_with("user123")

if __name__ == '__main__':
    unittest.main()
