from pydantic_settings import BaseSettings
from typing import List
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Learning Assistant"
    VERSION: str = "0.1.0"

    DEBUG: bool = False

    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    GEMINI_API_KEY: str

    ALLOWED_ORIGINS: str = ""

    @field_validator("ALLOWED_ORIGINS")
    @classmethod
    def parse_allowed_origins(cls, v: str) -> List[str]:
        return v.split(",") if v else []

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()