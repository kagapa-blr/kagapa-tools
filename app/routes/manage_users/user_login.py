from flask import Blueprint, render_template, request, jsonify, make_response
from app.security.jwt_utils import generate_jwt, decode_jwt
from app.services.user_management.create_users import UserReadService, UserAuthService
import jwt

user_login_bp = Blueprint("user_login", __name__)
DEFAULT_REDIRECT = "/"


def _safe_next_url(next_url: str) -> str:
    if not next_url or not next_url.startswith("/"):
        return DEFAULT_REDIRECT
    return next_url


def _get_token_from_request():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ")[1]
    return request.cookies.get("access_token")


@user_login_bp.route("/login", methods=["GET"])
def login_page():
    next_url = _safe_next_url(request.args.get("next"))
    return render_template("login.html", next=next_url)


@user_login_bp.route("/login", methods=["POST"])
def login_api():
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    password = data.get("password")
    next_url = _safe_next_url(data.get("next") or request.args.get("next"))

    if not username or not password:
        return jsonify(success=False, message="Username and password required"), 400

    user = UserReadService.get_user_by_username(username)
    if not user or not UserAuthService.verify_password(user, password):
        return jsonify(success=False, message="Invalid credentials"), 401
    if not user.is_active:
        return jsonify(success=False, message="Account deactivated"), 403

    access_token = generate_jwt(user)
    resp = make_response(
        jsonify(success=True, message="Login successful", access_token=access_token, redirect_to=next_url)
    )
    resp.set_cookie("access_token", access_token, httponly=True, samesite="Lax", secure=False)
    return resp, 200


@user_login_bp.route("/logout", methods=["POST"])
def logout():
    resp = make_response(jsonify(success=True, message="Logged out successfully"))
    resp.delete_cookie("access_token")
    return resp, 200


@user_login_bp.route("/me", methods=["GET"])
def me():
    token = _get_token_from_request()
    if not token:
        return jsonify(success=False, message="Unauthorized"), 401
    try:
        payload = decode_jwt(token)
        return jsonify(success=True, user={
            "username": payload.get("username"),
            "role": payload.get("role"),
            "is_active": payload.get("is_active")
        }), 200
    except jwt.ExpiredSignatureError:
        return jsonify(success=False, message="Token expired"), 401
    except jwt.InvalidTokenError:
        return jsonify(success=False, message="Invalid token"), 401
