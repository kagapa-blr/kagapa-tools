import os
import jwt
import pytz
from datetime import datetime, timedelta, timezone

IST = pytz.timezone("Asia/Kolkata")


def ist_now():
    return datetime.now(IST)


def utc_now():
    return datetime.now(timezone.utc)


# ------------------------------
# JWT CONFIG
# ------------------------------
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not set")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "kagapa-tools")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "kagapa-users")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))
JWT_CLOCK_SKEW_SECONDS = 30


# ------------------------------
# GENERATE JWT
# ------------------------------
def generate_jwt(user) -> str:
    now_utc = utc_now()
    now_ist = now_utc.astimezone(IST)
    expires_utc = now_utc + timedelta(minutes=JWT_EXPIRES_MINUTES)

    payload = {
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "sub": str(user.id),
        "iat": int(now_utc.timestamp()),
        "nbf": int(now_utc.timestamp()) - JWT_CLOCK_SKEW_SECONDS,
        "exp": int(expires_utc.timestamp()),
        "username": user.username,
        "role": user.role.value,
        "is_active": user.is_active,
        "tz": "Asia/Kolkata",
        "issued_at_ist": now_ist.isoformat(),
        "expires_at_ist": expires_utc.astimezone(IST).isoformat(),
    }

    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


# ------------------------------
# DECODE & VERIFY JWT
# ------------------------------
def decode_jwt(token: str) -> dict:
    return jwt.decode(
        jwt=token,
        key=JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
        audience=JWT_AUDIENCE,
        issuer=JWT_ISSUER,
        options={"require": ["exp", "iat", "nbf", "iss", "aud", "sub"]}
    )
