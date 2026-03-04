from fastapi import APIRouter, Depends
from app.core.verification.middlewares.auth_checks import get_current_user
from app.services.blockchain_service import (
    verify_property_service,
    get_verification_status_service
)

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])

@router.post("/verify/{property_id}")
async def verify_property(
    property_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Verifies a property on the Polygon blockchain.
    - Generates SHA-256 hash of property data
    - Sends hash to smart contract
    - Stores tx_hash in MongoDB
    
    Only the property owner can verify their property.
    """
    return await verify_property_service(property_id, current_user)

@router.get("/status/{property_id}")
async def verification_status(property_id: str):
    """
    Returns the on-chain verification status for a property.
    Public endpoint — anyone can check if a property is verified.
    """
    return await get_verification_status_service(property_id)
