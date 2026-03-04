from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.verification.middlewares.auth_checks import get_current_user
from app.services.auction_service import (
    create_auction_service,
    place_bid_service,
    finalize_auction_service,
    get_auction_detail_service,
    get_active_auctions_service,
)

router = APIRouter(prefix="/auction", tags=["Auction"])


class CreateAuctionRequest(BaseModel):
    reserve_price: float
    duration_hours: int = 24  # Default 24h auction
    tx_hash: str = ""  # On-chain transaction hash


class PlaceBidRequest(BaseModel):
    amount: float
    tx_hash: str = ""  # On-chain transaction hash


@router.post("/create/{property_id}")
async def create_auction(
    property_id: str,
    body: CreateAuctionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Start an auction for a property.
    Seller sets reserve price and duration.
    """
    return await create_auction_service(
        property_id, body.reserve_price, body.duration_hours, body.tx_hash, current_user
    )


@router.post("/{auction_id}/bid")
async def place_bid(
    auction_id: str,
    body: PlaceBidRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Place a bid on an active auction.
    Amount must exceed current highest bid + minimum increment.
    """
    return await place_bid_service(
        auction_id, body.amount, body.tx_hash, current_user
    )


@router.post("/bid/{property_id}")
async def place_bid_by_property(
    property_id: str,
    body: PlaceBidRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Convenience endpoint for frontend to bid using property ID.
    Finds the active auction for the property and places the bid.
    """
    from app.repository.auction_repo import get_auctions_by_property
    auctions = await get_auctions_by_property(property_id)
    active_auctions = [a for a in auctions if a.get("status") == "active"]
    
    if not active_auctions:
        raise HTTPException(status_code=404, detail="No active auction found for this property")
    
    auction_id = str(active_auctions[0]["id"])
    return await place_bid_service(
        auction_id, body.amount, body.tx_hash, current_user
    )


@router.post("/{auction_id}/finalize")
async def finalize_auction(
    auction_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Finalize a completed auction. Only the seller can call this after the deadline.
    """
    return await finalize_auction_service(auction_id, current_user)


@router.get("/{auction_id}")
async def get_auction_detail(auction_id: str):
    """
    Get full auction details including bid history, property data, and AI valuation.
    """
    return await get_auction_detail_service(auction_id)


@router.get("/active/all")
async def get_active_auctions():
    """
    Get all currently active auctions.
    """
    return await get_active_auctions_service()
