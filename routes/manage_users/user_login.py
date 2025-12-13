from flask import Blueprint, render_template, request, jsonify, g
from security.jwt_utils import generate_jwt, decode_jwt
import jwt
from services.user_management.create_users import (
    UserReadService,
    UserAuthService
)

user_login_bp = Blueprint("user_login", __name__)


# -----------------------------------
# LOGIN PAGE (HTML)
# -----------------------------------
@user_login_bp.route("/login", methods=["GET"])
def login_page():
    return render_template("login.html")


# -----------------------------------
# LOGIN API (JWT BASED)
# -----------------------------------
@user_login_bp.route("/login", methods=["POST"])
def login_api():
    """
    Authenticate user and issue JWT access token.
    If a valid token is already provided, user is already logged in.
    """
    # Check if Authorization header exists
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = decode_jwt(token)
            return jsonify(
                success=True,
                message=f"User '{payload.get('username')}' is already logged in. Please logout to login again.",
                access_token=token
            ), 200
        except jwt.ExpiredSignatureError:
            # Token expired, allow normal login
            pass
        except jwt.InvalidTokenError:
            # Invalid token, allow normal login
            pass

    # Normal login flow
    data = request.get_json(silent=True)
    if not data:
        return jsonify(success=False, message="JSON body required."), 400

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify(success=False, message="Username and password required."), 400

    user = UserReadService.get_user_by_username(username)
    if not user:
        return jsonify(success=False, message="User does not exist."), 401

    if not user.is_active:
        return jsonify(success=False, message="Account deactivated."), 403

    if not UserAuthService.verify_password(user, password):
        return jsonify(success=False, message="Incorrect password."), 401

    access_token = generate_jwt(user)

    return jsonify(
        success=True,
        message="Login successful.",
        access_token=access_token
    ), 200


# -----------------------------------
# LOGOUT (STATELESS JWT)
# -----------------------------------
@user_login_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify(success=True, message="Logged out successfully."), 200
