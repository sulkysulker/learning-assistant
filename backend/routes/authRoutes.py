from fastapi import APIRouter, Depends
from starlette import status
from typing import Annotated
from sqlalchemy.orm import Session
from config.db import get_db

from fastapi.security import OAuth2PasswordRequestForm
from controllers.authController import login_user, register_user
from middleware.auth import get_current_user
from models.user import User
from schemas.auth import AuthResponse, LoginSchema, RegisterSchema, UserResponse


db_dependency=Annotated[Session,Depends(get_db)]
current_user_dependency = Annotated[User, Depends(get_current_user)]


router=APIRouter(
    prefix='/auth',
    tags=['auth']
)

# public routes

@router.post('/register', response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def create_user(db: db_dependency, new_user: RegisterSchema):
    created_user, token = register_user(db, new_user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(created_user.id),
            "username": created_user.username,
            "email": created_user.email,
            "created_at": created_user.created_at,
        },
    }


@router.post('/login', response_model=AuthResponse, status_code=status.HTTP_200_OK)
def login(db: db_dependency, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    credentials = LoginSchema(username=form_data.username, password=form_data.password)
    user, token = login_user(db, credentials)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at,
        },
    }


@router.get('/me', response_model=UserResponse, status_code=status.HTTP_200_OK)
def profile(current_user: current_user_dependency):
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at,
    }
