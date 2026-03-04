from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.verification.middlewares.auth_checks import get_current_user
from app.services.verification_service import verify_property_for_listing, verify_listing_engine

router = APIRouter(prefix="/verify", tags=["Verification"])


class VerifyRequest(BaseModel):
    asking_price: Optional[float] = 0


@router.post("/{property_id}")
async def verify_property(
    property_id: str,
    body: VerifyRequest = VerifyRequest(),
    current_user: dict = Depends(get_current_user),
):
    """
    Run AI verification on a property before listing.
    Returns a verification report with PASS/WARN/FAIL status.
    """
    return await verify_property_for_listing(property_id, body.asking_price)


@router.get("/{property_id}/report")
async def get_verification_report(property_id: str):
    """
    Get a fresh verification report for a property.
    """
    return await verify_property_for_listing(property_id)


class VerifyListingRequest(BaseModel):
    kyc_verified: int
    registry_match: int
    ownership_match_score: float
    inside_kolkata: int
    duplicate_token: int

@router.post("-listing")
async def verify_new_listing(data: VerifyListingRequest):
    """
    Deterministic validation engine for new property listings.
    """
    return verify_listing_engine(data.model_dump())
