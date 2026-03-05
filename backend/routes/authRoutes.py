from fastapi import APIRouter
from pydantic import BaseModel,Field,EmailStr,SecretStr,field_validator


class registerVal(BaseModel):
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
        
class loginVal(BaseModel):
    email: EmailStr
    password : SecretStr        

router=APIRouter(
    prefix='/auth',
    tags=['auth']
)

# public routes

# @router.post('/register',response_model=registerVal,status_code=201)
# def user_register(username:str,)

# @router.post('/login',response_model=loginVal)

# private routes

# router.post('/profile')
