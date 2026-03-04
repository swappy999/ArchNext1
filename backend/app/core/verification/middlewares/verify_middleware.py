from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import time
import logging

logger = logging.getLogger("middleware")

class VerifyMiddleware(BaseHTTPMiddleware):
    """
    Global middleware to log requests and execution time.
    Actual authentication is handled via FastAPI dependencies (OAuth2PasswordBearer) 
    in auth_checks.py.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request
        # logger.info(f"Request: {request.method} {request.url}")

        response = await call_next(request)
        
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
