from fastapi import APIRouter,Depends
from starlette import status
from typing import Annotated
from sqlalchemy.orm import Session
from config.db import get_db

from controllers.authController import register_user
from schemas.auth import RegisterSchema, LoginSchema, RegisterResponse


db_dependency=Annotated[Session,Depends(get_db)]


router=APIRouter(
    prefix='/auth',
    tags=['auth']
)

# public routes

@router.post('/register',response_model=RegisterResponse,status_code=status.HTTP_201_CREATED)
def create_user(db:db_dependency,new_user:RegisterSchema):
    created_user = register_user(db,new_user)
    return {
        "username": created_user.username,
        "email": created_user.email,
    }



# @router.post('/login', response_model=LoginSchema)

# private routes

# router.post('/profile')
