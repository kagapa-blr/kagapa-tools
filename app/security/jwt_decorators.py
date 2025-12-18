from functools import wraps

import jwt
from flask import g
from flask import request, redirect, url_for, jsonify

from app.security.jwt_utils import decode_jwt


# ------------------ HELPERS ------------------

def _get_token():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1]
    return request.cookies.get("access_token")


def _wants_html():
    accept = request.headers.get("Accept", "")
    return (
            "text/html" in accept
            or request.accept_mimetypes.best == "text/html"
    )


def _safe_next_url():
    path = request.path
    if path.startswith("/login"):
        return "/"
    return path


def _redirect_to_login():
    return redirect(
        url_for("user_login.login_page", next=_safe_next_url())
    )


def _unauthorized(message="Unauthorized"):
    if _wants_html():
        return _redirect_to_login()
    return jsonify(success=False, message=message), 401


def _forbidden(message="Forbidden"):
    if _wants_html():
        return _redirect_to_login()
    return jsonify(success=False, message=message), 403


def _decode_and_attach(token):
    payload = decode_jwt(token)
    g.jwt_payload = payload
    return payload


# ------------------ DECORATORS ------------------


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get("access_token")
        if not token:
            # For API routes, return JSON
            if request.path.startswith("/api/"):
                return jsonify(success=False, message="Unauthorized"), 401
            # For page routes, redirect to log in
            return redirect(url_for("user_login.login_page", next=request.path))

        try:
            user = decode_jwt(token)
            request.user = user
        except Exception:
            return redirect(url_for("user_login.login_page", next=request.path))

        return f(*args, **kwargs)

    return decorated


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _get_token()
        if not token:
            return _unauthorized("Authorization token missing.")
        try:
            payload = _decode_and_attach(token)
            if payload.get("role") != "admin":
                return _forbidden("Admin access required.")
        except jwt.ExpiredSignatureError:
            return _unauthorized("Token expired.")
        except jwt.InvalidTokenError:
            return _unauthorized("Invalid token.")
        return fn(*args, **kwargs)

    return wrapper
