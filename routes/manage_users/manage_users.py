# routes/manage_users.py

from flask import Blueprint, request, jsonify
from services.user_management.create_users import (
    UserCreationService,
    UserReadService,
    UserUpdateService,
    UserDeleteService,
    UserAuthService
)

manage_users_bp = Blueprint("manage_users", __name__)


# ---------------- CREATE / SIGNUP ----------------
@manage_users_bp.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    phone = data.get("phone")

    user, error = UserCreationService.create_user(
        username=username,
        password=password,
        email=email,
        phone=phone
    )

    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value
        }
    }), 201


# ---------------- GET USER ----------------
@manage_users_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = UserReadService.get_user_by_id(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404

    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value,
            "is_active": user.is_active
        }
    })


# ---------------- LIST USERS ----------------
@manage_users_bp.route("/", methods=["GET"])
def list_users():
    role = request.args.get("role")  # optional filter: user/admin
    is_active = request.args.get("is_active", "true").lower() == "true"

    if role:
        from models.user_management import UserRole
        role = UserRole(role)

    users = UserReadService.list_users(role=role, is_active=is_active)
    users_list = [{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "phone": u.phone,
        "role": u.role.value,
        "is_active": u.is_active
    } for u in users]

    return jsonify({"success": True, "users": users_list})


# ---------------- UPDATE USER ----------------
@manage_users_bp.route("/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    data = request.json
    user, error = UserUpdateService.update_user(user_id, **data)

    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value,
            "is_active": user.is_active
        }
    })


# ---------------- DEACTIVATE / ACTIVATE USER ----------------
@manage_users_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
def deactivate_user(user_id):
    user, error = UserDeleteService.deactivate_user(user_id)
    if error:
        return jsonify({"success": False, "message": error}), 400
    return jsonify({"success": True, "message": f"User {user.username} deactivated."})


@manage_users_bp.route("/<int:user_id>/activate", methods=["PATCH"])
def activate_user(user_id):
    user, error = UserDeleteService.activate_user(user_id)
    if error:
        return jsonify({"success": False, "message": error}), 400
    return jsonify({"success": True, "message": f"User {user.username} activated."})


# ---------------- LOGIN / VERIFY PASSWORD ----------------
@manage_users_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = UserReadService.get_user_by_username(username)
    if not user or not UserAuthService.verify_password(user, password):
        return jsonify({"success": False, "message": "Invalid credentials."}), 401

    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role.value
        }
    })
