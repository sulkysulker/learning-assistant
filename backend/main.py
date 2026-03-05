from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from middleware.errorHandler import global_exception_handler
from config.db import create_tables
from config.settings import settings
from contextlib import asynccontextmanager

from routes import authRoutes


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

@app.get("/")
def root():
    return {"message": "Learning Assistant API running"}