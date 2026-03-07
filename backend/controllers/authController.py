from routes.authRoutes import registerSchema, db_dependency
from models.user import User
from passlib.context import CryptContext
bcrypt_context=CryptContext(schemes=['bcrypt'],deprecated='auto')


def register_user(db:db_dependency,new_user:registerSchema):
    create_user_model=User(
        username=new_user.username,
        email=new_user.email,
        hashed_password=bcrypt_context.hash(new_user.password.get_secret_value())
    )

    db.add(create_user_model)
    db.close()

    

