import secrets

from fastapi import Header, HTTPException, status
from app.core.config import settings


def is_valid_admin_key(key: str | None) -> bool:
    # Constant-time compare so response timing doesn't leak the key.
    return bool(key) and secrets.compare_digest(key.encode(), settings.ADMIN_SECRET_KEY.encode())


async def verify_admin_token(x_admin_token: str = Header(...)):
    if not is_valid_admin_key(x_admin_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Admin Token",
        )
    return x_admin_token
