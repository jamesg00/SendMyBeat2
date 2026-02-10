from datetime import datetime, timezone, timedelta
import jwt

def create_access_token_internal(user_id: str, username: str, secret: str, algorithm: str, expiration_minutes: int) -> str:
    """
    Internal helper to create a JWT access token.
    Separated from server logic to facilitate unit testing.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=expiration_minutes)
    to_encode = {"sub": user_id, "username": username, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=algorithm)
    return encoded_jwt
