from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from middleware.errorHandler import global_exception_handler

app = FastAPI(
    title="Learning Assistant",
    description="API for an AI-based assistant",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_exception_handler(Exception,global_exception_handler)

@app.get("/")
def root():
    return {"message": "Learning Assistant API running"}