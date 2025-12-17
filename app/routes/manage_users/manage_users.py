from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from app.models.user_management import UserRole
from app.schemas.user_management import (
    UserCreateSchema,
    UserUpdateSchema,
    UserResponseSchema,
)
from app.services.user_management.create_users import (
    UserCreationService,
    UserReadService,
    UserUpdateService,
    UserDeleteService,
    UserAuthService,
)

manage_users_bp = Blueprint("manage_users", __name__)


@manage_users_bp.route("/signup", methods=["POST"])
def signup():
    try:
        schema = UserCreateSchema(**request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    user, error = UserCreationService.create_user(schema)
    if error:
        return jsonify({"message": error}), 400

    return jsonify(
        UserResponseSchema.model_validate(user).model_dump()
    ), 201


@manage_users_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = UserReadService.get_user_by_id(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify(
        UserResponseSchema.model_validate(user).model_dump()
    )


@manage_users_bp.route("/", methods=["GET"])
def list_users():
    role_param = request.args.get("role")
    is_active = request.args.get("is_active", "true").lower() == "true"

    role = None
    if role_param:
        try:
            role = UserRole(role_param)
        except ValueError:
            return jsonify({"message": "Invalid role"}), 400

    users = UserReadService.list_users(role=role, is_active=is_active)

    return jsonify([
        UserResponseSchema.model_validate(u).model_dump()
        for u in users
    ])


@manage_users_bp.route("/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    try:
        schema = UserUpdateSchema(**request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    user, error = UserUpdateService.update_user(user_id, schema)
    if error:
        return jsonify({"message": error}), 400

    return jsonify(
        UserResponseSchema.model_validate(user).model_dump()
    )


@manage_users_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
def deactivate_user(user_id):
    user, error = UserDeleteService.deactivate_user(user_id)
    if error:
        return jsonify({"message": error}), 400
    return jsonify({"message": f"{user.username} deactivated"})


@manage_users_bp.route("/<int:user_id>/activate", methods=["PATCH"])
def activate_user(user_id):
    user, error = UserDeleteService.activate_user(user_id)
    if error:
        return jsonify({"message": error}), 400
    return jsonify({"message": f"{user.username} activated"})


@manage_users_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid request"}), 400

    user = UserReadService.get_user_by_username(data.get("username"))
    if not user or not UserAuthService.verify_password(
            user, data.get("password")
    ):
        return jsonify({"message": "Invalid credentials"}), 401

    return jsonify({
        "id": user.id,
        "username": user.username,
        "role": user.role.value,
    })
