from config.settings import settings
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

engine=create_engine(settings.DATABASE_URL, pool_pre_ping=True)

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

    inspector = inspect(engine)
    if not inspector.has_table("quiz_attempts"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("quiz_attempts")}
    statements = []

    if "quiz_id" not in existing_columns:
        statements.append("ALTER TABLE quiz_attempts ADD COLUMN quiz_id UUID")
    if "answers" not in existing_columns:
        statements.append("ALTER TABLE quiz_attempts ADD COLUMN answers JSON")
    if "score" not in existing_columns:
        statements.append("ALTER TABLE quiz_attempts ADD COLUMN score INTEGER")
    if "attempted_at" not in existing_columns:
        statements.append("ALTER TABLE quiz_attempts ADD COLUMN attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
    if "quiz_title" in existing_columns:
        statements.append("ALTER TABLE quiz_attempts ALTER COLUMN quiz_title SET DEFAULT ''")
        statements.append("ALTER TABLE quiz_attempts ALTER COLUMN quiz_title DROP NOT NULL")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))