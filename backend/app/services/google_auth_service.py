from app.integrations.google_oauth import verify_google_token
from app.repository.user_repo import get_user_by_email, create_user
from app.core.verification.utils.crypto_utils import create_access_token, create_refresh_token
from app.services.auth_service import get_password_hash
from app.api.routes.auth import Token
import secrets
import string

async def authenticate_google_user(token: str) -> Token:
    """
    Verifies Google token, finds or creates user, and returns JWT tokens.
    """
    # 1. Verify token with Google
    try:
        id_info = verify_google_token(token)
    except ValueError:
        raise ValueError("Invalid Google token")

    email = id_info.get("email")
    name = id_info.get("name")
    picture = id_info.get("picture")

    if not email:
        raise ValueError("Email not found in Google token")

    # 2. Check if user exists
    user = await get_user_by_email(email)

    if not user:
        # 3. Create new user if not exists
        # Generate random password (user won't use it, they use Google)
        chars = string.ascii_letters + string.digits
        random_pw = ''.join(secrets.choice(chars) for _ in range(16))
        hashed = get_password_hash(random_pw)
        
        user_data = {
            "username": name or email.split("@")[0],
            "email": email,
            "hashed_password": hashed,
            "role": "user",
            "provider": "google",
            "avatar": picture
        }
        user = await create_user(user_data)

    # 4. Generate JWTs
    access_token = create_access_token(data={"sub": str(user["_id"])})
    refresh_token = create_refresh_token(data={"sub": str(user["_id"])})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token
    }
