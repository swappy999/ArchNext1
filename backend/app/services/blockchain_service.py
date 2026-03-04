from app.integrations.blockchain import (
    generate_property_hash,
    verify_property_on_chain,
    check_verification_on_chain
)
from app.repository.property_repo import get_property_by_id, update_property
from fastapi import HTTPException
from app.core.verification.errors.exceptions import AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError

async def verify_property_service(property_id: str, current_user: dict) -> dict:
    """
    Full verification flow:
    1. Fetch property from DB
    2. Generate SHA-256 hash of stable property fields
    3. Send hash to Polygon smart contract
    4. Store tx_hash in MongoDB
    5. Return verification result
    """
    # 1. Fetch property
    property_data = await get_property_by_id(property_id)
    if not property_data:
        raise NotFoundError(detail="Property not found")
    
    # 2. Ownership check
    if str(property_data.get("owner_id")) != str(current_user["_id"]):
        raise AuthorizationError(detail="Only the owner can verify this property")
    
    # 3. Generate hash
    property_hash = generate_property_hash(property_data)
    
    # 4. Send to blockchain
    result = verify_property_on_chain(property_hash)
    
    # 5. Save hash + tx_hash to MongoDB (regardless of blockchain mode)
    update_data = {
        "property_hash": property_hash,
        "blockchain_verified": result["success"],
        "blockchain_mode": result["mode"]
    }
    if result.get("tx_hash"):
        update_data["blockchain_hash"] = result["tx_hash"]
    
    await update_property(property_id, update_data)
    
    return {
        "property_id": property_id,
        "property_hash": property_hash,
        "blockchain_result": result
    }

async def get_verification_status_service(property_id: str) -> dict:
    """
    Returns the on-chain verification status for a property.
    """
    property_data = await get_property_by_id(property_id)
    if not property_data:
        raise NotFoundError(detail="Property not found")
    
    property_hash = property_data.get("property_hash")
    if not property_hash:
        return {
            "property_id": property_id,
            "verified": False,
            "message": "Property has not been submitted for verification yet."
        }
    
    on_chain = check_verification_on_chain(property_hash)
    
    return {
        "property_id": property_id,
        "property_hash": property_hash,
        "blockchain_hash": property_data.get("blockchain_hash"),
        "on_chain": on_chain
    }
