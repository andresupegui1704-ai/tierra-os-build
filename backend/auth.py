"""Simple JWT auth for admin dashboard."""
import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Header


def _secret() -> str:
    return os.environ.get("JWT_SECRET", "dev-secret")


def verify_admin(email: str, password: str) -> bool:
    admin_email = os.environ.get("ADMIN_EMAIL", "")
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    return bool(admin_email) and email == admin_email and password == admin_password


def create_token(email: str) -> str:
    payload = {
        "sub": email,
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, _secret(), algorithm="HS256")


def require_admin(authorization: str = Header(default="")) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, _secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return payload["sub"]
