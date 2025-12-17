from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import IntegrityError

from app.models.user_management import User, UserRole
from app.schemas.user_management import UserCreateSchema, UserUpdateSchema
from app.config.database import kagapa_tools_db as db
from app.utils.logger import setup_logger

logger = setup_logger(name="user_management_service")


class UserCreationService:
    @staticmethod
    def create_user(user_data: UserCreateSchema):
        try:
            hashed_password = generate_password_hash(user_data.password)

            user = User(
                username=user_data.username,
                password=hashed_password,
                phone=user_data.phone,
                email=user_data.email,
                role=user_data.role or UserRole.USER,
                is_active=user_data.is_active,
            )

            db.session.add(user)
            db.session.commit()
            return user, None

        except IntegrityError as e:
            db.session.rollback()
            msg = str(e.orig)
            if "username" in msg:
                return None, "Username already exists."
            if "email" in msg:
                return None, "Email already exists."
            if "phone" in msg:
                return None, "Phone number already exists."
            return None, "Integrity error occurred."

        except Exception as e:
            db.session.rollback()
            return None, str(e)


class UserReadService:
    @staticmethod
    def get_user_by_id(user_id: int):
        return User.query.get(user_id)

    @staticmethod
    def get_user_by_username(username: str):
        return User.query.filter_by(username=username).first()

    @staticmethod
    def list_users(role: UserRole = None, is_active: bool = True):
        query = User.query.filter_by(is_active=is_active)
        if role:
            query = query.filter_by(role=role)
        return query.all()


class UserUpdateService:
    @staticmethod
    def update_user(user_id: int, user_data: UserUpdateSchema):
        user = User.query.get(user_id)
        if not user:
            return None, "User not found."

        update_data = user_data.model_dump(exclude_unset=True)

        if "password" in update_data:
            update_data["password"] = generate_password_hash(
                update_data["password"]
            )

        for key, value in update_data.items():
            setattr(user, key, value)

        try:
            db.session.commit()
            return user, None

        except IntegrityError as e:
            db.session.rollback()
            msg = str(e.orig)
            if "username" in msg:
                return None, "Username already exists."
            if "email" in msg:
                return None, "Email already exists."
            if "phone" in msg:
                return None, "Phone number already exists."
            return None, "Integrity error occurred."

        except Exception as e:
            db.session.rollback()
            return None, str(e)


class UserDeleteService:
    @staticmethod
    def deactivate_user(user_id: int):
        user = User.query.get(user_id)
        if not user:
            return None, "User not found."
        user.is_active = False
        db.session.commit()
        return user, None

    @staticmethod
    def activate_user(user_id: int):
        user = User.query.get(user_id)
        if not user:
            return None, "User not found."
        user.is_active = True
        db.session.commit()
        return user, None


class UserAuthService:
    @staticmethod
    def verify_password(user: User, password: str) -> bool:
        return check_password_hash(user.password, password)
