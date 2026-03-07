from fastapi import APIRouter,Depends
from starlette import status
from typing import Annotated
from sqlalchemy.orm import Session
from pydantic import BaseModel,Field,EmailStr,SecretStr,field_validator
from config.db import get_db

from controllers.authController import register_user


class registerSchema(BaseModel):
    username : str = Field(...,min_length=3,max_length=12)
    email : EmailStr
    password : SecretStr = Field(...,min_length=6,max_length=12)

    @field_validator('password')
    @classmethod
    def strong_password(cls,v:SecretStr) -> SecretStr:
        s=v.get_secret_value()

        if not any (c.islower() for c in s):
            raise ValueError("Password must contain a lower letter")
        if not any (c.isupper() for c in s):
            raise ValueError("Password must contain a upper letter")
        if not any (c.isdigit() for c in s):
            raise ValueError("Password must contain a number")


class loginSchema(BaseModel):
    email: EmailStr
    password : SecretStr        


class register_response(BaseModel):
    username: str
    email : EmailStr



db_dependency=Annotated[Session,Depends(get_db)]


router=APIRouter(
    prefix='/auth',
    tags=['auth']
)

# public routes

@router.post('/register',response_model=register_response,status_code=status.HTTP_201_CREATED)
def create_user(db:db_dependency,new_user:registerSchema):
    register_user(db,new_user)



# @router.post('/login',response_model=loginVal)

# private routes

# router.post('/profile')
