from models.user import User
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from schemas.auth import RegisterSchema

# bcrypt_context=CryptContext(schemes=['bcrypt'],deprecated='auto')
bcrypt_context = CryptContext(
    schemes=["bcrypt_sha256"],
    deprecated="auto"
)

def register_user(db: Session, new_user: RegisterSchema) -> User:
    create_user_model=User(
        username=new_user.username,
        email=new_user.email,
        hashed_password=bcrypt_context.hash(new_user.password.get_secret_value())
    )

    db.add(create_user_model)
    db.commit()
    db.refresh(create_user_model)
    return create_user_model

    

