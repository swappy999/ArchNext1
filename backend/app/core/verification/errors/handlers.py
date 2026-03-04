from fastapi import Request
from fastapi.responses import JSONResponse
from .exceptions import AppError

async def app_error_handler(request: Request, exc: AppError):
    """
    Global exception handler for all subclasses of AppError.
    Formats the error response consistently as JSON.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

def register_exception_handlers(app):
    """Registers the custom exception handlers with the FastAPI app."""
    app.add_exception_handler(AppError, app_error_handler)
