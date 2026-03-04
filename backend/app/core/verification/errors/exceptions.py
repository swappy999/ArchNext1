from fastapi import status

class AppError(Exception):
    """Base exception for all application-specific errors."""
    def __init__(self, detail: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.detail = detail
        self.status_code = status_code
        super().__init__(self.detail)

class AuthenticationError(AppError):
    """Raised when authentication fails (e.g., invalid token)."""
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)

class AuthorizationError(AppError):
    """Raised when a user lacks privileges to access a resource."""
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)

class NotFoundError(AppError):
    """Raised when a requested resource is not found."""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)

class ValidationError(AppError):
    """Raised when input validation fails."""
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)

class ConflictError(AppError):
    """Raised when there is a state conflict (e.g., resource already exists)."""
    def __init__(self, detail: str = "Conflict occurred"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)
