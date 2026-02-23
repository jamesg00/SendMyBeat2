import os
import sys
import pytest
from pydantic import ValidationError

# Mock environment variables BEFORE importing server
# This prevents the server from crashing due to missing env vars or trying to connect to real services
os.environ["MONGO_URL"] = "mongodb://mock-mongo:27017"
os.environ["JWT_SECRET_KEY"] = "mock-secret"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_EXPIRATION_MINUTES"] = "30"
os.environ["STRIPE_SECRET_KEY"] = "mock-stripe-key"
os.environ["LLM_PROVIDER"] = "grok"
os.environ["GROK_API_KEY"] = "mock-grok-key"

# Try to import SubscriptionStatus from backend.server
# We need to handle path issues depending on where pytest is run from
try:
    from backend.server import SubscriptionStatus
except ImportError:
    # If running from backend directory
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from server import SubscriptionStatus

def test_valid_subscription_status_free():
    """Test creating a valid free subscription status."""
    status = SubscriptionStatus(
        is_subscribed=False,
        plan="free",
        daily_credits_remaining=2,
        daily_credits_total=3,
        upload_credits_remaining=1,
        upload_credits_total=3
    )
    assert status.is_subscribed is False
    assert status.plan == "free"
    assert status.daily_credits_remaining == 2
    assert status.daily_credits_total == 3

def test_valid_subscription_status_pro():
    """Test creating a valid pro subscription status."""
    status = SubscriptionStatus(
        is_subscribed=True,
        plan="pro",
        daily_credits_remaining=-1,
        daily_credits_total=-1,
        upload_credits_remaining=-1,
        upload_credits_total=-1
    )
    assert status.is_subscribed is True
    assert status.plan == "pro"

def test_invalid_plan_value():
    """Test that invalid plan values raise ValidationError."""
    # This test verifies that 'plan' must be exactly 'free' or 'pro'
    with pytest.raises(ValidationError) as excinfo:
        SubscriptionStatus(
            is_subscribed=False,
            plan="basic",  # Invalid plan
            daily_credits_remaining=3,
            daily_credits_total=3,
            upload_credits_remaining=3,
            upload_credits_total=3
        )

    # Check that the error is about the plan field
    errors = excinfo.value.errors()
    assert any(error['loc'] == ('plan',) for error in errors)

def test_missing_fields():
    """Test that missing required fields raise ValidationError."""
    with pytest.raises(ValidationError):
        SubscriptionStatus(
            is_subscribed=False,
            # Missing plan
            daily_credits_remaining=3,
            daily_credits_total=3,
            upload_credits_remaining=3,
            upload_credits_total=3
        )

def test_invalid_types():
    """Test that invalid types raise ValidationError."""
    with pytest.raises(ValidationError):
        SubscriptionStatus(
            is_subscribed=True,
            plan="free",
            daily_credits_remaining="invalid-int", # Invalid int
            daily_credits_total=3,
            upload_credits_remaining=3,
            upload_credits_total=3
        )
