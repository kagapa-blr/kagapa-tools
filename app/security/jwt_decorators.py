from functools import wraps
from flask import request, g, jsonify, redirect, url_for
from app.security.jwt_utils import decode_jwt
import jwt

# -----------------------------------
# Helpers
# -----------------------------------
def _get_token():
    """
    Try Authorization header first, fallback to HttpOnly cookie.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1]
    # Cookie support for HTML clients
    return request.cookies.get("access_token")


def _wants_html():
    """
    True if the client expects an HTML page.
    """
    accept = request.headers.get("Accept", "")
    return "text/html" in accept or request.accept_mimetypes.best_match(["text/html", "application/json"]) == "text/html"


def _safe_next_url():
    """
    Prevent redirect loops: avoid sending /login as next
    """
    next_url = request.full_path.rstrip("?")
    if next_url.startswith("/login"):
        return "/"
    return next_url


def _redirect_to_login():
    return redirect(url_for("user_login.login_page", next=_safe_next_url()))


def _unauthorized(message="Unauthorized"):
    if _wants_html():
        return _redirect_to_login()
    return jsonify(success=False, message=message), 401


def _forbidden(message="Forbidden"):
    if _wants_html():
        return _redirect_to_login()
    return jsonify(success=False, message=message), 403


# -----------------------------------
# LOGIN REQUIRED
# -----------------------------------
def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _get_token()
        if not token:
            return _unauthorized("Authorization token missing.")

        try:
            g.jwt_payload = decode_jwt(token)
        except jwt.ExpiredSignatureError:
            return _unauthorized("Token expired.")
        except jwt.InvalidTokenError:
            return _unauthorized("Invalid token.")

        return fn(*args, **kwargs)
    return wrapper


# -----------------------------------
# ADMIN REQUIRED
# -----------------------------------
def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _get_token()
        if not token:
            return _unauthorized("Authorization token missing.")

        try:
            payload = decode_jwt(token)
            if payload.get("role") != "admin":
                return _forbidden("Admin access required.")
            g.jwt_payload = payload
        except jwt.ExpiredSignatureError:
            return _unauthorized("Token expired.")
        except jwt.InvalidTokenError:
            return _unauthorized("Invalid token.")

        return fn(*args, **kwargs)
    return wrapper
