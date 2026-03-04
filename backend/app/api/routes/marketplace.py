from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.verification.middlewares.auth_checks import get_current_user
from app.services.marketplace_service import (
    get_all_listings_service,
    get_property_listing_service,
    list_property_service
)
from app.services.property_state.property_state_controller import update_property_state
from app.services.property_state.property_state_machine import PropertyEvent
from app.repository.property_repo import get_property_by_id
from fastapi import HTTPException
from app.core.verification.errors.exceptions import AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

class ListingRequest(BaseModel):
    price_matic: float | None = None
    price: float | None = None
    tx_hash: str | None = None

class BuyRequest(BaseModel):
    price: float
    price_matic: float | None = None
    tx_hash: str | None = None

@router.get("/listings")
async def get_all_listings():
    """
    Returns all active on-chain property listings with metadata.
    Public endpoint — anyone can browse the marketplace.
    """
    return await get_all_listings_service()

@router.get("/property/{token_id}")
async def get_listing_status(token_id: int):
    """
    Returns the on-chain listing status for a specific NFT token.
    Public — anyone can check if a property is for sale.
    """
    return await get_property_listing_service(token_id)

@router.post("/list/{property_id}")
async def list_property(
    property_id: str,
    body: ListingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Prepares a property listing and returns the data needed for MetaMask.
    
    Flow:
    1. Backend validates ownership and NFT status
    2. Returns contract call data for frontend MetaMask transaction
    3. Frontend calls listProperty() on-chain via MetaMask
    
    Note: Actual buying happens on-chain via MetaMask — no backend involvement.
    """
    return await list_property_service(property_id, body.price_matic, body.price, current_user)

@router.post("/buy/{listing_id}")
async def buy_listing(
    listing_id: str,
    body: BuyRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Records a buy intent for On-Chain properties, or processes the purchase directly for Standard properties.
    """
    # 1. Fetch the property
    prop = await get_property_by_id(listing_id)
    if not prop:
        raise NotFoundError(detail="Property not found")
        
    if prop.get("status") not in ["listed", "available"]:
        raise ValidationError(detail="Property is no longer available for direct sale")

    wallet = current_user.get("wallet_address", current_user.get("email"))
    # Strictly use the internal DB ID (_id) for portfolio tracking
    user_id = str(current_user.get("_id"))
    if not user_id:
        raise AuthenticationError(detail="User identification lost")

    # 2. Determine if it's considered "On-Chain"
    has_token = prop.get("nft_token_id") is not None
    
    if has_token:
        if body.tx_hash:
            await update_property_state(
                PropertyEvent.PROPERTY_SOLD,
                listing_id,
                payload={"buyer_id": user_id, "tx_hash": body.tx_hash, "price_matic": body.price_matic, "price": body.price}
            )
            return {
                "listing_id": listing_id,
                "buyer": user_id,
                "status": "completed",
                "tx_hash": body.tx_hash,
                "message": "On-chain purchase recorded. View in your portfolio.",
                "is_nft": True
            }

        return {
            "listing_id": listing_id,
            "buyer_wallet": wallet,
            "price": body.price,
            "status": "pending_blockchain_confirmation",
            "message": "Use the marketplace contract `buyProperty(tokenId)` via MetaMask to complete this purchase.",
            "action_required": "METAMASK_TX",
            "is_nft": True
        }
    else:
        # Standard flow - immediately update DB
        await update_property_state(
            PropertyEvent.PROPERTY_SOLD,
            listing_id,
            payload={"buyer_id": user_id, "price": body.price}
        )
            
        return {
            "listing_id": listing_id,
            "buyer": user_id,
            "price": body.price,
            "status": "completed",
            "message": "Asset acquired successfully. View in your portfolio.",
            "is_nft": False
        }

