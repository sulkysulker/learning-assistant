from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config.db import get_db
from config.settings import settings
from controllers.authController import get_user_by_id
from models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_user_from_token(db: Session, token: str) -> User | None:
	try:
		payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
		user_id = payload.get("sub")
		if not user_id:
			return None
	except JWTError:
		return None

	return get_user_by_id(db, user_id)


def get_current_user(
	token: str = Depends(oauth2_scheme),
	db: Session = Depends(get_db),
) -> User:
	credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
	user = get_user_from_token(db, token)
	if not user:
		raise credentials_exception

	return user
