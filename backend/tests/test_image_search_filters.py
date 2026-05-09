import os
import sys
from pathlib import Path
from unittest.mock import patch


backend_root = Path(__file__).resolve().parents[1]
sys.path.append(str(backend_root))

os.environ["MONGO_URL"] = "mongodb://mock:27017"
os.environ["JWT_SECRET_KEY"] = "mock_secret"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_EXPIRATION_MINUTES"] = "60"
os.environ["STRIPE_SECRET_KEY"] = "mock_stripe"
os.environ["STRIPE_PRICE_ID"] = "mock_price"
os.environ["OPENAI_API_KEY"] = "mock_openai_key"
os.environ["GROK_API_KEY"] = "mock_grok_key"

with patch("motor.motor_asyncio.AsyncIOMotorClient"), patch("stripe.api_key"):
    from backend.server import _build_image_query_variants, _filter_generated_image_results


def test_artist_image_queries_include_music_context_and_negative_terms():
    artists, query_variants, query = _build_image_query_variants("lil uzi vert", [])

    assert query == "lil uzi vert"
    assert any(artist.lower() == "lil uzi vert" for artist in artists)
    assert any("rapper aesthetic wallpaper" in variant for variant in query_variants)
    assert any("-handbag" in variant or "-bag" in variant for variant in query_variants)


def test_artist_image_filter_drops_fashion_results():
    kept = _filter_generated_image_results([
        {
            "source": "bing-images",
            "image_url": "https://example.com/lil-uzi-vert-portrait.jpg",
            "artist": "Lil Uzi Vert",
            "query_used": "lil uzi vert rapper aesthetic wallpaper",
            "credit_name": "Lil Uzi Vert",
            "base_query": "lil uzi vert",
            "search_mode": "artist",
        },
        {
            "source": "bing-images",
            "image_url": "https://shop.example.com/lil-uzi-vert-handbag.jpg",
            "artist": "Lil Uzi Vert",
            "query_used": "lil uzi vert luxury handbag",
            "credit_name": "Luxury handbag",
            "base_query": "lil uzi vert",
            "search_mode": "artist",
        },
    ])

    assert len(kept) == 1
    assert "portrait" in kept[0]["image_url"]
