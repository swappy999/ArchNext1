from app.repository.user_repo import get_user_by_email, create_user, update_user
from app.core.verification.utils.crypto_utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    create_reset_token, verify_reset_token
)
from app.integrations.email_service import send_verification_email, send_recovery_email
from app.integrations.google_oauth import verify_google_token

import random

def generate_verification_code():
    return str(random.randint(100000, 999999))

def generate_nonce():
    return str(random.randint(100000, 999999))

# ─── Sign In ─────────────────────────────────────────────────────────────────
async def email_login(data, background_tasks):
    user = await get_user_by_email(data.email)
    if not user:
        return {"error": "Invalid email or password"}

    if not verify_password(data.password, user["password_hash"]):
        return {"error": "Invalid email or password"}

    # Generate a fresh OTP for this login session
    code = generate_verification_code()
    await update_user(
        {"email": data.email},
        {
            "verification_code": code,
            "email_verified": False  # Force re-verification every login
        }
    )

    # Send the OTP asynchronously
    background_tasks.add_task(send_verification_email, data.email, code)

    return {
        "message": "Verification code sent",
        "requires_verification": True,
        "email": data.email
    }

# ─── Sign Up ─────────────────────────────────────────────────────────────────
async def email_signup(data, background_tasks):
    existing_user = await get_user_by_email(data.email)
    if existing_user:
        return {"error": "User already exists"}

    code = generate_verification_code()
    hashed_pw = hash_password(data.password)

    user_data = {
        "email": data.email,
        "username": data.username,
        "password_hash": hashed_pw,
        "email_verified": False,
        "verification_code": code,
        "role": "user"
    }

    await create_user(user_data)

    token = create_access_token({"email": data.email})
    refresh_token = create_refresh_token({"email": data.email})

    # Send OTP asynchronously
    background_tasks.add_task(send_verification_email, data.email, code)

    return {
        "message": "Signup successful",
        "access_token": token,
        "refresh_token": refresh_token
    }

# ─── Verify OTP ──────────────────────────────────────────────────────────────
async def verify_email_code_service(data):
    user = await get_user_by_email(data.email)
    if not user:
        return {"error": "User not found"}

    if user.get("verification_code") != data.code:
        return {"error": "Invalid verification code"}

    await update_user(
        {"email": data.email},
        {
            "email_verified": True,
            "verification_code": None  # Invalidate code after use
        }
    )

    token = create_access_token({"email": data.email})
    refresh_token = create_refresh_token({"email": data.email})

    return {
        "message": "Email verified successfully",
        "access_token": token,
        "refresh_token": refresh_token,
        "email_verified": True
    }

# ─── Forgot Password (sends OTP code) ──────────────────────────────────
async def forgot_password_service(email: str, background_tasks):
    user = await get_user_by_email(email)
    if not user:
    # Return success even if user doesn't exist (security best practice)
        return {"message": "If that email is registered, a recovery link has been sent."}

    # Create a JWT-based reset token (15 min expiry)
    reset_token = create_reset_token(email)

    # Build the recovery link
    import os
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/auth/reset-password?token={reset_token}"

    # Send asynchronously
    background_tasks.add_task(send_recovery_email, email, reset_link)

    return {"message": "If that email is registered, a recovery link has been sent."}

# ─── Reset Password (from recovery link) ─────────────────────────────────────
async def reset_password_service(token: str, password: str, confirm_password: str):
    if password != confirm_password:
        return {"error": "Passwords do not match"}

    # Verify the reset token
    email = verify_reset_token(token)
    if not email:
        return {"error": "Invalid or expired reset link. Please request a new one."}

    user = await get_user_by_email(email)
    if not user:
        return {"error": "User not found"}

    # Hash and save the new password
    hashed_pw = hash_password(password)
    await update_user(
        {"email": email},
        {"password_hash": hashed_pw}
    )

    return {"message": "Password reset successfully. You can now sign in with your new password."}

# ─── Google Login (skip OTP, go straight to MetaMask) ────────────────────────
async def google_login_service(google_token):
    user_info = verify_google_token(google_token)
    if not user_info:
        return {"error": "Invalid Google token"}

    email = user_info["email"]
    google_id = user_info["sub"]

    user = await get_user_by_email(email)
    if not user:
        username = email.split("@")[0]
        await create_user({
            "email": email,
            "username": username,
            "google_id": google_id,
            "email_verified": True,
            "role": "user"
        })

    token = create_access_token({"email": email})
    refresh_token = create_refresh_token({"email": email})

    return {
        "access_token": token,
        "refresh_token": refresh_token,
        "email_verified": True
    }


# ─── Resend Verification ─────────────────────────────────────────────────────
async def resend_verification_service(email: str, background_tasks):
    user = await get_user_by_email(email)
    if not user:
        return {"error": "User not found"}

    code = generate_verification_code()
    await update_user(
        {"email": email},
        {"verification_code": code}
    )

    background_tasks.add_task(send_verification_email, email, code)
    
    return {"message": "Verification code resent"}
