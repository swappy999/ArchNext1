from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.core.config import settings
from app.repository.user_repo import (
    get_user_by_email,
    get_user_by_wallet
)
from app.services.token_service import is_token_blacklisted
from app.core.verification.errors.exceptions import AuthenticationError, AuthorizationError

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    if await is_token_blacklisted(token):
        raise AuthenticationError(detail="Token revoked")

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )

        email = payload.get("email")
        wallet = payload.get("wallet_address")

        if email:
            user = await get_user_by_email(email)

        elif wallet:
            user = await get_user_by_wallet(wallet)

        else:
            raise AuthenticationError(detail="Invalid token")

        if not user:
            raise AuthenticationError(detail="User not found")

        return user

    except JWTError as e:
        raise AuthenticationError(detail="Invalid token")


def require_roles(allowed_roles: list):

    def role_checker(current_user: dict = Depends(get_current_user)):

        if current_user.get("role") not in allowed_roles:
            raise AuthorizationError(
                detail="Permission denied"
            )

        return current_user

    return role_checker
