from datetime import datetime
import pytz
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from config.database import kagapa_tools_db as db  # Explicit Flask-SQLAlchemy instance
import enum

# IST timezone
IST = pytz.timezone("Asia/Kolkata")


class UserRole(enum.Enum):
    USER = "user"
    ADMIN = "admin"


class User(db.Model):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False, unique=True)
    password = Column(String(255), nullable=False)  # hashed password
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True, unique=True)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(IST))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(IST),
                        onupdate=lambda: datetime.now(IST))
    is_active = Column(Boolean, default=True)  # optional: soft delete / account status

    def __repr__(self):
        return f"<User(username='{self.username}', role='{self.role.value}')>"
