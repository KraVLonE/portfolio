from fastapi import Header, HTTPException, status
from app.core.config import settings

async def verify_admin_token(x_admin_token: str = Header(...)):
    if x_admin_token != settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Admin Token",
        )
    return x_admin_token
