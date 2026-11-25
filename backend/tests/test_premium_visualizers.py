import os
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['JWT_SECRET_KEY'] = 'test_secret'
os.environ['JWT_ALGORITHM'] = 'HS256'
os.environ['JWT_EXPIRATION_MINUTES'] = '30'
os.environ['STRIPE_SECRET_KEY'] = 'sk_test_123'
os.environ['STRIPE_PRICE_ID'] = 'price_123'
os.environ['GOOGLE_CLIENT_ID'] = 'client_id'
os.environ['GOOGLE_CLIENT_SECRET'] = 'client_secret'
os.environ['DB_NAME'] = 'test_db'

try:
    from backend import server
except ImportError:
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from backend import server


def _args(**overrides):
    args = dict(
        current_user={"id": "user_1"},
        title="Beat",
        description_id="d1",
        tags_id=None,
        privacy_status="public",
        audio_file_id="a1",
        image_file_id="i1",
        description_override=None,
        aspect_ratio="16:9",
        image_scale=1.0,
        image_scale_x=None,
        image_scale_y=None,
        image_pos_x=0.0,
        image_pos_y=0.0,
        image_rotation=0.0,
        background_color="black",
        remove_watermark=False,
    )
    args.update(overrides)
    return args


class TestPremiumVisualizerGate(unittest.IsolatedAsyncioTestCase):
    async def _run(self, plan, style):
        db = MagicMock()
        # Stop right after the plan checks: no YouTube connection means a 400, which proves the gate passed.
        db.youtube_connections.find_one = AsyncMock(return_value=None)
        with patch.object(server, "db", db), patch.object(server, "get_user_subscription_status", AsyncMock(return_value={"plan": plan})):
            with self.assertRaises(HTTPException) as caught:
                await server._build_youtube_upload_job_payload(**_args(visualizer_style=style))
        return caught.exception

    async def test_free_user_cannot_render_a_pro_style(self):
        error = await self._run("free", "dot-record")
        self.assertEqual(error.status_code, 402)
        self.assertEqual(error.detail["feature"], "premium_visualizer")

    async def test_plus_and_max_can_render_pro_styles(self):
        for plan in ("plus", "max"):
            error = await self._run(plan, "terrain-sun")
            self.assertEqual(error.status_code, 400)

    async def test_free_styles_stay_free(self):
        for style in ("circle", "monstercat", "spectrum", "proximity", None):
            error = await self._run("free", style)
            self.assertEqual(error.status_code, 400)


if __name__ == "__main__":
    unittest.main()
