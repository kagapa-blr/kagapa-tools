# services/user_management/create_users.py

from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import IntegrityError
from models.user_management import User, UserRole
from config.database import kagapa_tools_db as db
from utils.logger import setup_logger

logger = setup_logger(name='user_management_service')


class UserCreationService:
    """Service class for creating new users."""

    @staticmethod
    def create_user(username: str, password: str, **kwargs):
        """
        Create a new user with default role 'user'.
        Accepts optional fields via kwargs (phone, email, etc.)
        Returns (user, error)
        """
        logger.info(f"Attempting to create user: {username}")
        try:
            hashed_password = generate_password_hash(password)
            new_user = User(
                username=username,
                password=hashed_password,
                role=UserRole.USER,
                **kwargs
            )
            db.session.add(new_user)
            db.session.commit()
            logger.info(f"User created successfully: {username} (ID: {new_user.id})")
            return new_user, None
        except IntegrityError as e:
            db.session.rollback()
            error_msg = str(e.orig)
            logger.error(f"IntegrityError while creating user {username}: {error_msg}")
            if "username" in error_msg:
                return None, "Username already exists."
            if "email" in error_msg:
                return None, "Email already exists."
            if "phone" in error_msg:
                return None, "Phone number already exists."
            return None, "Integrity error occurred."
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Unexpected error while creating user {username}: {e}")
            return None, str(e)


class UserReadService:
    """Service class for reading user data."""

    @staticmethod
    def get_user_by_id(user_id: int):
        logger.info(f"Fetching user by ID: {user_id}")
        return User.query.get(user_id)

    @staticmethod
    def get_user_by_username(username: str):
        logger.info(f"Fetching user by username: {username}")
        return User.query.filter_by(username=username).first()

    @staticmethod
    def list_users(role: UserRole = None, is_active: bool = True):
        logger.info(f"Listing users. Role filter: {role}, Active: {is_active}")
        query = User.query.filter_by(is_active=is_active)
        if role:
            query = query.filter_by(role=role)
        users = query.all()
        logger.info(f"Found {len(users)} users")
        return users


class UserUpdateService:
    """Service class for updating user details."""

    @staticmethod
    def update_user(user_id: int, **kwargs):
        logger.info(f"Updating user ID: {user_id} with {kwargs}")
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User not found: ID {user_id}")
            return None, "User not found."

        # Hash password if updating
        if "password" in kwargs:
            kwargs["password"] = generate_password_hash(kwargs["password"])

        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)

        try:
            db.session.commit()
            logger.info(f"User updated successfully: ID {user_id}")
            return user, None
        except IntegrityError as e:
            db.session.rollback()
            error_msg = str(e.orig)
            logger.error(f"IntegrityError while updating user ID {user_id}: {error_msg}")
            if "username" in error_msg:
                return None, "Username already exists."
            if "email" in error_msg:
                return None, "Email already exists."
            if "phone" in error_msg:
                return None, "Phone number already exists."
            return None, "Integrity error occurred."
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Unexpected error while updating user ID {user_id}: {e}")
            return None, str(e)


class UserDeleteService:
    """Service class for soft deleting/deactivating users."""

    @staticmethod
    def deactivate_user(user_id: int):
        logger.info(f"Deactivating user ID: {user_id}")
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User not found: ID {user_id}")
            return None, "User not found."
        user.is_active = False
        try:
            db.session.commit()
            logger.info(f"User deactivated successfully: ID {user_id}")
            return user, None
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Error deactivating user ID {user_id}: {e}")
            return None, str(e)

    @staticmethod
    def activate_user(user_id: int):
        logger.info(f"Activating user ID: {user_id}")
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User not found: ID {user_id}")
            return None, "User not found."
        user.is_active = True
        try:
            db.session.commit()
            logger.info(f"User activated successfully: ID {user_id}")
            return user, None
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Error activating user ID {user_id}: {e}")
            return None, str(e)


class UserAuthService:
    """Service class for authentication-related operations."""

    @staticmethod
    def verify_password(user: User, password: str) -> bool:
        logger.info(f"Verifying password for user: {user.username}")
        return check_password_hash(user.password, password)
