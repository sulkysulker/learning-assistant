from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from middleware.errorHandler import global_exception_handler
from config.db import create_tables
from config.settings import settings
from contextlib import asynccontextmanager

from models.document import Document  # noqa: F401
from models.flashcard import FlashcardSet  # noqa: F401
from models.quiz import QuizAttempt  # noqa: F401
from models.userActivity import UserActivity  # noqa: F401

from routes import authRoutes, dashboardRoutes, documentRoutes


@asynccontextmanager
async def lifespan(app:FastAPI):
    create_tables()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for an AI-based assistant",
    version=settings.VERSION,
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_exception_handler(Exception, global_exception_handler)

app.include_router(authRoutes.router,prefix=settings.API_PREFIX)
app.include_router(dashboardRoutes.router,prefix=settings.API_PREFIX)
app.include_router(documentRoutes.router,prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {"message": "Learning Assistant API running"}