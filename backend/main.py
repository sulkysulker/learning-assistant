from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from config.db import create_tables
from config.settings import settings
from middleware.errorHandler import global_exception_handler
from models.document import Document  # noqa: F401
from models.flashcard import Flashcard, FlashcardReview, FlashcardSet  # noqa: F401
from models.quiz import Quiz, QuizAttempt, QuizQuestion  # noqa: F401
from models.userActivity import UserActivity  # noqa: F401

limiter = Limiter(key_func=get_remote_address)

from routes import (
    authRoutes,
    dashboardRoutes,
    documentRoutes,
    flashcardRoutes,
    quizRoutes,
    userRoutes,
)


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


async def rate_limit_exceeded_handler(request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests, please try again later"},
    )


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


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
app.include_router(flashcardRoutes.router,prefix=settings.API_PREFIX)
app.include_router(flashcardRoutes.flashcards_router,prefix=settings.API_PREFIX)
app.include_router(flashcardRoutes.set_router,prefix=settings.API_PREFIX)
app.include_router(quizRoutes.router,prefix=settings.API_PREFIX)
app.include_router(quizRoutes.quiz_router,prefix=settings.API_PREFIX)
app.include_router(userRoutes.router,prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {"message": "Learning Assistant API running"}