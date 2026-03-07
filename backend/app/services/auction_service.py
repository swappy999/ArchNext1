from app.repository.auction_repo import (
    create_auction, get_auction_by_id, get_active_auctions,
    update_auction, create_bid, get_bids_for_auction,
    get_auctions_by_property
)
from app.repository.property_repo import get_property_by_id
from app.services.prediction_service import get_prediction, _is_loaded
from fastapi import HTTPException
from app.core.verification.errors.exceptions import AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError
from datetime import datetime, timedelta


async def create_auction_service(property_id: str, reserve_price: float,
                                  duration_hours: int, tx_hash: str, current_user: dict) -> dict:
    """Start an auction for a property."""
    prop = await get_property_by_id(property_id)
    if not prop:
        raise NotFoundError(detail="Property not found")

    if str(prop.get("owner_id")) != str(current_user.get("_id", current_user.get("id"))):
        raise AuthorizationError(detail="Only the owner can create an auction")

    # Check for existing active auctions
    existing = await get_auctions_by_property(property_id)
    active_ones = [a for a in existing if a.get("status") == "active"]
    if active_ones:
        raise ValidationError(detail="Property already has an active auction")

    from app.services.property_state.property_state_controller import update_property_state
    from app.services.property_state.property_state_machine import PropertyEvent
    
    # AI Re-Verification and Property State Sync
    user_id = str(current_user.get("_id", current_user.get("id")))
    await update_property_state(
        PropertyEvent.AUCTION_STARTED,
        property_id,
        payload={
            "price": reserve_price,
            "user_id": user_id
        }
    )

    now = datetime.utcnow()
    auction_data = {
        "property_id": property_id,
        "seller_id": str(current_user.get("_id", current_user.get("id"))),
        "reserve_price": reserve_price,
        "min_bid_increment": reserve_price * 0.05,  # 5% of reserve
        "start_time": now,
        "end_time": now + timedelta(hours=duration_hours),
        "status": "active",
        "current_bid": 0,
        "bid_count": 0,
        "tx_hash": tx_hash,
    }

    auction = await create_auction(auction_data)

    return {
        **auction,
        "property": prop,
        "message": f"Auction created. Ends in {duration_hours} hours."
    }


async def place_bid_service(auction_id: str, amount: float,
                             tx_hash: str, current_user: dict) -> dict:
    """Record a bid on an auction."""
    auction = await get_auction_by_id(auction_id)
    if not auction:
        raise NotFoundError(detail="Auction not found")

    if auction["status"] != "active":
        raise ValidationError(detail="Auction is not active")

    now = datetime.utcnow()
    end_time = auction["end_time"]
    if isinstance(end_time, str):
        end_time = datetime.fromisoformat(end_time)

    if now >= end_time:
        raise ValidationError(detail="Auction has ended")

    # Validate bid amount
    if auction["current_bid"] == 0:
        if amount < auction["reserve_price"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Initial bid must be at least the reserve price of ₹{auction['reserve_price']:,.2f}"
            )
    else:
        min_required = auction["current_bid"] + auction["min_bid_increment"]
        if amount < min_required:
            raise HTTPException(
                status_code=400,
                detail=f"Bid too low. The next minimum bid is ₹{min_required:,.2f} (current + 5% increment)."
            )

    seller_id = str(auction.get("seller_id", ""))
    user_id = str(current_user.get("_id", current_user.get("id", "")))
    
    if user_id == seller_id:
        raise ValidationError(detail="Seller cannot bid on their own auction. Please use a different account.")

    wallet = current_user.get("wallet_address") or current_user.get("email") or "unknown"

    from app.services.escrow_service import lock_funds
    
    # Simulate Escrow Lock
    escrow_id = await lock_funds(wallet, amount, str(auction["property_id"]))
    if not escrow_id:
        raise HTTPException(status_code=400, detail="Insufficient funds or escrow lock failed.")

    # Record bid
    bid = await create_bid({
        "auction_id": auction_id,
        "bidder_id": user_id,
        "bidder_wallet": wallet,
        "amount": amount,
        "tx_hash": tx_hash,
    })

    # Anti-sniping: extend by 5 min if bid in last 5 min
    new_end_time = end_time
    time_remaining = (end_time - now).total_seconds()
    if time_remaining < 300:  # 5 minutes
        new_end_time = end_time + timedelta(minutes=5)

    # Update auction state
    await update_auction(auction_id, {
        "current_bid": amount,
        "highest_bidder": wallet,
        "bid_count": auction["bid_count"] + 1,
        "end_time": new_end_time,
    })

    # Broadcast BID_PLACED event to all WebSocket clients
    try:
        from app.services.property_state.property_events import property_bus
        from app.services.property_state.property_state_machine import PropertyEvent
        await property_bus.emit(PropertyEvent.BID_PLACED, {
            "auction_id": auction_id,
            "property_id": str(auction["property_id"]),
            "amount": amount,
            "bidder": wallet,
            "new_end_time": new_end_time.isoformat(),
        })
    except Exception:
        pass

    return {
        "bid": bid,
        "auction_id": auction_id,
        "new_highest_bid": amount,
        "new_end_time": new_end_time.isoformat(),
        "message": "Bid placed successfully!"
    }



async def finalize_auction_service(auction_id: str, current_user: dict) -> dict:
    """Finalize an ended auction."""
    auction = await get_auction_by_id(auction_id)
    if not auction:
        raise NotFoundError(detail="Auction not found")

    seller_id = auction.get("seller_id", "")
    user_id = str(current_user.get("_id", current_user.get("id", "")))
    if user_id != seller_id:
        raise AuthorizationError(detail="Only seller can finalize")

    if auction["status"] != "active":
        raise ValidationError(detail="Auction is not active")

    now = datetime.utcnow()
    end_time = auction["end_time"]
    if isinstance(end_time, str):
        end_time = datetime.fromisoformat(end_time)

    if now < end_time:
        raise ValidationError(detail="Auction still running")

    await update_auction(auction_id, {"status": "finalized"})
    
    from app.services.property_state.property_state_controller import update_property_state
    from app.services.property_state.property_state_machine import PropertyEvent
    # Transition the property status to OWNED by the winner
    winner = auction.get("highest_bidder")
    if winner:
        # In this mock/prototype, highest_bidder is wallet. For a full sync, we should resolve to user ID.
        # But setting owner_id to wallet is supported for fallback.
        await update_property_state(
            PropertyEvent.PROPERTY_SOLD,
            str(auction["property_id"]),
            payload={
                "winner_id": winner
            }
        )
        
        from app.services.escrow_service import resolve_auction_escrows
        await resolve_auction_escrows(str(auction["property_id"]), winner)

    return {
        "auction_id": auction_id,
        "winner": auction.get("highest_bidder"),
        "winning_bid": auction.get("current_bid"),
        "status": "finalized",
        "message": "Auction finalized. Use smart contract to complete transfer."
    }


def _classify_tier(price: float) -> str:
    if price > 8000: return "A"
    if price > 5000: return "B"
    return "C"

async def get_auction_detail_service(auction_id: str) -> dict:
    """Get auction details with bid history and real urban AI valuation."""
    auction = await get_auction_by_id(auction_id)
    if not auction:
        raise NotFoundError(detail="Auction not found")

    bids = await get_bids_for_auction(auction_id)
    prop = await get_property_by_id(str(auction["property_id"]))

    # Add real AI urban intelligence
    ai_valuation = None
    if prop and _is_loaded:
        try:
            lat = prop.get("latitude", 0)
            lng = prop.get("longitude", 0)
            if lat and lng:
                prediction = await get_prediction(lat, lng)
                intel = get_auction_intelligence(prediction)
                
                area = prop.get("area_sqft", 1200)
                ai_valuation = {
                    "ward_name": prediction["ward_name"],
                    "zone_category": prediction["zone_category"],
                    "predicted_price_per_sqft": round(prediction["predicted_price"], 2),
                    "predicted_price_per_sqm": round(prediction["predicted_price_sqm"], 2),
                    "total_estimated_value": round(prediction["predicted_price"] * area, 0),
                    "confidence": 88.0, 
                    "market_tier": _classify_tier(prediction["predicted_price"]),
                    "infra_score": round(prediction["infra_score"] * 100, 1),
                    "access_score": round(prediction["access_score"] * 100, 1),
                    "demand_score": round(prediction["demand_score"] * 100, 1),
                    "cbd_score": round(prediction["cbd_score"] * 100, 1),
                    "river_score": round(prediction["river_score"] * 100, 1),
                    "auction_intelligence": intel
                }
        except Exception as e:
            print(f"AI Valuation Error: {e}")
            pass

    return {
        "auction": auction,
        "property": prop,
        "bids": bids,
        "ai_valuation": ai_valuation,
    }


async def get_active_auctions_service() -> list:
    """Get all active auctions with property data."""
    auctions = await get_active_auctions()
    enriched = []
    for auction in auctions:
        prop = await get_property_by_id(str(auction["property_id"]))
        enriched.append({
            **auction,
            "property": prop,
        })
    return enriched

