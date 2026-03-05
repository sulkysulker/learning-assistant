from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base

from config.settings import settings

engine=create_engine(settings.DATABASE_URL)

session_local=sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base=declarative_base()

def get_db():
    db=session_local()
    try:
        yield db
    finally:
        db.close()    

def create_tables():
    Base.metadata.create_all(bind=engine)