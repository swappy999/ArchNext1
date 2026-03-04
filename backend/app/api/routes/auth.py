"""
Auth Routes — ArchNext Security Layer
========================================
All public auth endpoints are rate-limited to prevent brute-force
and credential stuffing attacks (OWASP A07:2021).
"""

from fastapi import APIRouter, Depends, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.auth_schema import (
    EmailSignup, EmailLogin, VerifyEmailCode, ForgotPassword,
    ResendVerification, ResetPassword, GoogleLoginRequest,
    RefreshTokenRequest, WalletNonceRequest, WalletVerifyRequest,
)
from app.services.auth_service import (
    generate_nonce, forgot_password_service,
    resend_verification_service, email_signup, email_login,
    verify_email_code_service, reset_password_service, google_login_service
)
from app.services.token_service import blacklist_token
from app.repository.user_repo import get_user_by_email, update_user, get_user_by_wallet, create_user
from app.integrations.metamask import verify_wallet_signature
from app.core.verification.utils.crypto_utils import create_access_token, create_refresh_token
from app.core.config import settings
from app.core.verification.middlewares.auth_checks import get_current_user
from app.core.rate_limiter import limiter, AUTH_LIMIT, VERIFY_LIMIT
from jose import jwt

security = HTTPBearer()
router = APIRouter()


# ─── Token Refresh ───────────────────────────────────────────────────────────
@router.post("/refresh")
@limiter.limit(AUTH_LIMIT)  # SECURITY: rate-limited
async def refresh_token(request: Request, data: RefreshTokenRequest):
    try:
        payload = jwt.decode(
            data.refresh_token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )

        if payload.get("type") != "refresh":
            return {"error": "Invalid token"}

        # Extract only necessary fields to avoid polluting the new token
        user_data = {}
        if "email" in payload:
            user_data["email"] = payload["email"]
        if "wallet_address" in payload:
             user_data["wallet_address"] = payload["wallet_address"]

        new_access = create_access_token(user_data)

        return {"access_token": new_access}

    except Exception as e:
        return {"error": "Invalid refresh token"}


# ─── Logout ──────────────────────────────────────────────────────────────────
@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    await blacklist_token(token)
    return {"message": "Logged out successfully"}


# ─── Signup ──────────────────────────────────────────────────────────────────
@router.post("/signup")
@limiter.limit(AUTH_LIMIT)  # SECURITY: 5/min per IP
async def signup(request: Request, data: EmailSignup, background_tasks: BackgroundTasks):
    return await email_signup(data, background_tasks)


# ─── Login ───────────────────────────────────────────────────────────────────
@router.post("/login")
@limiter.limit(AUTH_LIMIT)  # SECURITY: 5/min per IP
async def login(request: Request, data: EmailLogin, background_tasks: BackgroundTasks):
    return await email_login(data, background_tasks)


# ─── Email Verification ─────────────────────────────────────────────────────
@router.post("/verify-email")
@limiter.limit(VERIFY_LIMIT)  # SECURITY: 3/min per IP
async def verify_email(request: Request, data: VerifyEmailCode):
    return await verify_email_code_service(data)


# ─── Forgot Password ────────────────────────────────────────────────────────
@router.post("/forgot-password")
@limiter.limit(VERIFY_LIMIT)  # SECURITY: 3/min per IP (prevents email enumeration spam)
async def forgot_password(request: Request, data: ForgotPassword, background_tasks: BackgroundTasks):
    return await forgot_password_service(data.email, background_tasks)


# ─── Resend Verification ────────────────────────────────────────────────────
@router.post("/resend-verification")
@limiter.limit(VERIFY_LIMIT)  # SECURITY: 3/min per IP
async def resend_verification(request: Request, data: ResendVerification, background_tasks: BackgroundTasks):
    return await resend_verification_service(data.email, background_tasks)


# ─── Reset Password ─────────────────────────────────────────────────────────
@router.post("/reset-password")
@limiter.limit(AUTH_LIMIT)  # SECURITY: 5/min per IP
async def reset_password(request: Request, data: ResetPassword):
    return await reset_password_service(data.token, data.password, data.confirm_password)


# ─── Google Login ────────────────────────────────────────────────────────────
@router.post("/google-login")
@limiter.limit(AUTH_LIMIT)  # SECURITY: 5/min per IP
async def google_login(request: Request, data: GoogleLoginRequest):
    return await google_login_service(data.token)


# ─── Wallet Nonce ────────────────────────────────────────────────────────────
@router.post("/wallet-nonce")
@limiter.limit(AUTH_LIMIT)  # SECURITY: 5/min per IP
async def wallet_nonce(request: Request, data: WalletNonceRequest):

    nonce = generate_nonce()

    user = await get_user_by_wallet(data.wallet_address)

    if not user:
        await create_user({
            "wallet_address": data.wallet_address,
            "nonce": nonce,
            "email_verified": True,
            "role": "user"
        })
    else:
        await update_user(
            {"wallet_address": data.wallet_address},
            {"nonce": nonce}
        )

    return {"nonce": nonce}


# ─── Wallet Verify ───────────────────────────────────────────────────────────
@router.post("/wallet-verify")
@limiter.limit(AUTH_LIMIT)  # SECURITY: 5/min per IP
async def wallet_verify(request: Request, data: WalletVerifyRequest):

    # Verify signature
    recovered = verify_wallet_signature(
        data.message,
        data.signature
    )

    if recovered.lower() != data.wallet_address.lower():
        return {"error": "Invalid signature"}

    # Verify nonce from database
    user = await get_user_by_wallet(data.wallet_address)

    if not user:
        return {"error": "User not found"}

    # Check if the signed message contains the correct nonce
    expected_nonce = user.get("nonce")
    if not expected_nonce or expected_nonce not in data.message:
        return {"error": "Invalid nonce or nonce expired"}

    # Clear nonce after successful login
    await update_user(
        {"wallet_address": data.wallet_address},
        {"nonce": None}
    )

    token = create_access_token({
        "wallet_address": data.wallet_address
    })
    refresh_token = create_refresh_token({
        "wallet_address": data.wallet_address
    })

    return {
        "access_token": token,
        "refresh_token": refresh_token
    }

# ─── Protected Test ──────────────────────────────────────────────────────────
@router.get("/protected-test")
async def protected_test(current_user=Depends(get_current_user)):
    return {
        "message": "Access granted",
        "user": str(current_user)
    }
