import os
import jwt
import pytz
from datetime import datetime, timedelta, timezone

# -----------------------------------
# Timezone
# -----------------------------------
IST = pytz.timezone("Asia/Kolkata")


def _ist_now():
    """
    Returns timezone-aware current datetime in IST.
    """
    return datetime.now(IST)


# -----------------------------------
# JWT CONFIG (FROM .env)
# -----------------------------------
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "kagapa-tools")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "kagapa-users")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))


# -----------------------------------
# GENERATE JWT
# -----------------------------------
def generate_jwt(user):
    """
    Generate a JWT token using IST timezone.
    JWT timestamps are converted to UTC epoch seconds.
    """

    ist_now = _ist_now()
    expires_ist = ist_now + timedelta(minutes=JWT_EXPIRES_MINUTES)

    payload = {
        # ── Standard JWT Claims ─────────────────────────
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "sub": str(user.id),

        # ── Time Claims (UTC Epoch) ─────────────────────
        "iat": int(ist_now.astimezone(timezone.utc).timestamp()),
        "exp": int(expires_ist.astimezone(timezone.utc).timestamp()),

        # ── Application Claims ─────────────────────────
        "username": user.username,
        "role": user.role.value,
        "is_active": user.is_active,

        # ── Audit / Debug (IST) ─────────────────────────
        "tz": "Asia/Kolkata",
        "issued_at_ist": ist_now.isoformat(),
        "expires_at_ist": expires_ist.isoformat(),
    }

    token = jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )

    return token


# -----------------------------------
# DECODE & VERIFY JWT
# -----------------------------------
def decode_jwt(token):
    """
    Decode and validate JWT.
    Raises jwt exceptions if invalid/expired.
    """

    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
        audience=JWT_AUDIENCE,
        issuer=JWT_ISSUER,
    )
