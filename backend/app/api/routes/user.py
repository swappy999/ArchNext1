from fastapi import APIRouter, Depends, Request
from app.core.verification.middlewares.auth_checks import get_current_user, require_roles
from app.repository.user_repo import update_user
from app.models.user_model import _generate_security_key
from app.core.rate_limiter import limiter, WRITE_LIMIT
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
import json
import re

router = APIRouter()


class UpdatePreferences(BaseModel):
    """SECURITY: extra='forbid' rejects unexpected fields (mass assignment prevention)."""
    model_config = ConfigDict(extra="forbid")

    price_alerts: Optional[bool] = None
    zone_intel: Optional[bool] = None
    marketplace: Optional[bool] = None
    ai_predictions: Optional[bool] = None


class UpdateProfile(BaseModel):
    """SECURITY: Username is regex-validated, length-limited, extra fields rejected."""
    model_config = ConfigDict(extra="forbid")

    username: Optional[str] = Field(None, min_length=2, max_length=30)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError("Username may only contain letters, numbers, and underscores")
        return v.strip() if v else v


@router.get("/admin-dashboard")
async def admin_dashboard(
    current_user=Depends(get_current_user),
    role_check=Depends(require_roles(["admin"]))
):
    return {"message": "Admin access granted"}

@router.get("/dashboard")
async def dashboard(current_user=Depends(get_current_user)):

    return {
        "email": current_user.get("email"),
        "wallet": current_user.get("wallet_address")
    }

@router.get("/me")
async def get_my_profile(current_user=Depends(get_current_user)):
    # Remove sensitive data like password_hash
    current_user.pop("password_hash", None)
    current_user.pop("verification_code", None)
    current_user.pop("nonce", None)

    # Parse preferences JSON if present
    prefs_str = current_user.get("preferences")
    if prefs_str and isinstance(prefs_str, str):
        try:
            current_user["preferences"] = json.loads(prefs_str)
        except:
            current_user["preferences"] = {"price_alerts": True, "zone_intel": True, "marketplace": False, "ai_predictions": True}
    elif not prefs_str:
        current_user["preferences"] = {"price_alerts": True, "zone_intel": True, "marketplace": False, "ai_predictions": True}

    return {
        "user": current_user
    }


@router.put("/preferences")
@limiter.limit(WRITE_LIMIT)  # SECURITY: 20/min per user
async def update_preferences(request: Request, data: UpdatePreferences, current_user=Depends(get_current_user)):
    """Update user notification preferences."""
    # Get current preferences
    prefs_str = current_user.get("preferences", "{}")
    try:
        prefs = json.loads(prefs_str) if isinstance(prefs_str, str) else (prefs_str or {})
    except:
        prefs = {}

    # Only overwrite fields that were provided
    update_map = data.model_dump(exclude_none=True)
    prefs.update(update_map)

    email = current_user.get("email")
    wallet = current_user.get("wallet_address")
    query = {"email": email} if email else {"wallet_address": wallet}

    await update_user(query, {"preferences": json.dumps(prefs)})
    return {"message": "Preferences updated", "preferences": prefs}


@router.post("/regenerate-key")
@limiter.limit(WRITE_LIMIT)  # SECURITY: 20/min per user
async def regenerate_security_key(request: Request, current_user=Depends(get_current_user)):
    """Generate a fresh security key for the user."""
    new_key = _generate_security_key()

    email = current_user.get("email")
    wallet = current_user.get("wallet_address")
    query = {"email": email} if email else {"wallet_address": wallet}

    await update_user(query, {"security_key": new_key})
    return {"security_key": new_key}


@router.put("/profile")
@limiter.limit(WRITE_LIMIT)  # SECURITY: 20/min per user
async def update_profile(request: Request, data: UpdateProfile, current_user=Depends(get_current_user)):
    """Update user profile fields (username)."""
    email = current_user.get("email")
    wallet = current_user.get("wallet_address")
    query = {"email": email} if email else {"wallet_address": wallet}

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        return {"message": "No fields to update"}

    await update_user(query, update_data)
    return {"message": "Profile updated", **update_data}
