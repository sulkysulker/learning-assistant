from fastapi import Request
from fastapi.responses import JSONResponse
from jose import JWTError
from pydantic import ValidationError

async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc),
        },
    )