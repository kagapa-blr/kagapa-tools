# app/schemas/user_management.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# -----------------------------
# API Enum (keep in sync with DB)
# -----------------------------
class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


# -----------------------------
# Base Schema (shared fields)
# -----------------------------
class UserBaseSchema(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Unique username"
    )
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="User phone number"
    )
    email: Optional[EmailStr] = Field(
        None,
        description="User email address"
    )
    role: UserRole = Field(
        default=UserRole.USER,
        description="User role"
    )
    is_active: bool = Field(
        default=True,
        description="Account active status"
    )


# -----------------------------
# Create Schema (POST / signup)
# -----------------------------
class UserCreateSchema(UserBaseSchema):
    password: str = Field(
        ...,
        min_length=8,
        max_length=255,
        description="Hashed password will be stored"
    )


# -----------------------------
# Update Schema (PATCH / PUT)
# -----------------------------
class UserUpdateSchema(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    password: Optional[str] = Field(None, min_length=8, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


# -----------------------------
# Response Schema (SAFE output)
# -----------------------------
class UserResponseSchema(UserBaseSchema):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        # Required to convert SQLAlchemy objects → dict
        from_attributes = True  # Pydantic v2
        # orm_mode = True        # Pydantic v1
