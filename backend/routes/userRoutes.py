from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette import status

from config.db import get_db
from controllers.authController import change_password
from middleware.auth import get_current_user
from models.user import User
from schemas.auth import PasswordChangeSchema

db_dependency = Annotated[Session, Depends(get_db)]
current_user_dependency = Annotated[User, Depends(get_current_user)]

router = APIRouter(prefix='/users', tags=['users'])


@router.patch('/me/password', status_code=status.HTTP_204_NO_CONTENT)
def update_password(
    db: db_dependency,
    current_user: current_user_dependency,
    password_data: PasswordChangeSchema,
):
    change_password(db, current_user, password_data)