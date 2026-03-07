from config.db import Base
from sqlalchemy import Column,String,Integer


class User(Base):
    __tablename__='User'
    id = Column(Integer,primary_key=True,unique=True,index=True)
    username = Column(String,unique=True)
    email = Column(String,unique=True)
    hashed_password = Column(String)
