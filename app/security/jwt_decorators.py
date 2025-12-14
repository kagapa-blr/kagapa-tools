from functools import wraps
from flask import request, g, jsonify
from app.security.jwt_utils import decode_jwt
import jwt


# -----------------------------------
# Helper: Extract token from Authorization header
# -----------------------------------
def _get_token_from_header():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ")[1]


# -----------------------------------
# LOGIN REQUIRED DECORATOR
# -----------------------------------
def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _get_token_from_header()
        if not token:
            return jsonify({"success": False, "message": "Authorization token missing."}), 401

        try:
            payload = decode_jwt(token)
            g.jwt_payload = payload  # make payload accessible inside the route
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Token expired."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Invalid token."}), 401

        return fn(*args, **kwargs)

    return wrapper


# -----------------------------------
# ADMIN REQUIRED DECORATOR
# -----------------------------------
def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _get_token_from_header()
        if not token:
            return jsonify({"success": False, "message": "Authorization token missing."}), 401

        try:
            payload = decode_jwt(token)
            if payload.get("role") != "admin":
                return jsonify({"success": False, "message": "Admin access required."}), 403

            g.jwt_payload = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Token expired."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Invalid token."}), 401

        return fn(*args, **kwargs)

    return wrapper
