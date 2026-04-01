from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator


class RegisterSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=12)
    email: EmailStr
    password: SecretStr = Field(..., min_length=6, max_length=12)

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: SecretStr) -> SecretStr:
        raw = value.get_secret_value()

        if not any(char.islower() for char in raw):
            raise ValueError("Password must contain a lowercase letter")
        if not any(char.isupper() for char in raw):
            raise ValueError("Password must contain an uppercase letter")
        if not any(char.isdigit() for char in raw):
            raise ValueError("Password must contain a number")

        return value


class LoginSchema(BaseModel):
    email: EmailStr
    password: SecretStr


class RegisterResponse(BaseModel):
    username: str
    email: EmailStr


class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
