"""
Auth Schemas — ArchNext Security Layer
========================================
Strict input validation for all authentication payloads.

OWASP: All schemas enforce:
  - Field length limits (prevent DoS via oversized payloads)
  - Regex patterns where applicable (prevent injection)
  - extra="forbid" (reject unexpected fields → prevent mass assignment)
"""

from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
import re


# ─── Signup ──────────────────────────────────────────────────────────────────
class EmailSignup(BaseModel):
    model_config = ConfigDict(extra="forbid")  # SECURITY: reject unknown fields

    username: str = Field(
        ..., min_length=2, max_length=30,
        description="2–30 chars, alphanumeric and underscores only"
    )
    email: EmailStr
    password: str = Field(
        ..., min_length=8, max_length=128,
        description="8–128 characters"
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """SECURITY: Allow characters common in names while preventing injection."""
        if not re.match(r'^[a-zA-Z0-9._\s-]+$', v):
            raise ValueError("Username may contain letters, numbers, spaces, dots, hyphens, and underscores")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """SECURITY: Enforce minimum password complexity."""
        if len(v.strip()) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ─── Login ───────────────────────────────────────────────────────────────────
class EmailLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


# ─── Email Verification ─────────────────────────────────────────────────────
class VerifyEmailCode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    code: str = Field(
        ..., min_length=6, max_length=6,
        pattern=r'^[0-9]{6}$',
        description="Exactly 6 digits"
    )


# ─── Forgot Password ────────────────────────────────────────────────────────
class ForgotPassword(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr


# ─── Resend Verification ────────────────────────────────────────────────────
class ResendVerification(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr


# ─── Reset Password ─────────────────────────────────────────────────────────
class ResetPassword(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(..., min_length=10, max_length=2048, description="JWT reset token")
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        """SECURITY: Ensure password and confirm_password match."""
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


# ─── Google Login ────────────────────────────────────────────────────────────
class GoogleLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(..., min_length=10, max_length=4096, description="Google ID token")


# ─── Token Refresh ───────────────────────────────────────────────────────────
class RefreshTokenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    refresh_token: str = Field(..., min_length=10, max_length=4096, description="JWT refresh token")


# ─── Wallet Auth ─────────────────────────────────────────────────────────────
class WalletNonceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    wallet_address: str = Field(
        ..., min_length=42, max_length=42,
        pattern=r'^0x[a-fA-F0-9]{40}$',
        description="Ethereum address (0x + 40 hex chars)"
    )


class WalletVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    wallet_address: str = Field(
        ..., min_length=42, max_length=42,
        pattern=r'^0x[a-fA-F0-9]{40}$',
        description="Ethereum address"
    )
    signature: str = Field(
        ..., min_length=10, max_length=200,
        description="Hex-encoded signature"
    )
    message: str = Field(
        ..., min_length=1, max_length=500,
        description="Signed message containing nonce"
    )
