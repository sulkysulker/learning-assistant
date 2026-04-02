from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from jose import jwt
from models.user import User
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config.settings import settings
from schemas.auth import LoginSchema, RegisterSchema

bcrypt_context = CryptContext(
    schemes=["bcrypt_sha256"],
    deprecated="auto"
)


def create_access_token(subject: str) -> str:
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expires_at = datetime.now(timezone.utc) + expires_delta
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def register_user(db: Session, new_user: RegisterSchema) -> tuple[User, str]:
    existing_user = db.query(User).filter(User.email == new_user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_username = db.query(User).filter(User.username == new_user.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    create_user_model=User(
        username=new_user.username,
        email=new_user.email,
        hashed_password=bcrypt_context.hash(new_user.password.get_secret_value())
    )

    db.add(create_user_model)
    db.commit()
    db.refresh(create_user_model)
    token = create_access_token(str(create_user_model.id))
    return create_user_model, token


def login_user(db: Session, credentials: LoginSchema) -> tuple[User, str]:
    user = db.query(User).filter(User.username == credentials.username).first()
    password = credentials.password.get_secret_value()

    if not user or not bcrypt_context.verify(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(str(user.id))
    return user, token


def get_user_by_id(db: Session, user_id: str) -> User | None:
    try:
        parsed_user_id = UUID(user_id)
    except ValueError:
        return None

    return db.query(User).filter(User.id == parsed_user_id).first()

    

