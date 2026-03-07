from app.integrations.marketplace import get_listing, list_property_backend
from app.repository.property_repo import get_property_by_id, get_all_properties, update_property
from app.core.config import settings
from app.services.prediction_service import get_prediction, _is_loaded
from blockchain.blockchain_service import execute_sell as chain_sell
from fastapi import HTTPException
from app.core.verification.errors.exceptions import AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError
import random

# Market tier classification based on predicted price per sqft
def _classify_tier(predicted_price: float) -> str:
    if predicted_price >= 14000:
        return "Grade A"
    elif predicted_price >= 10000:
        return "Grade B"
    elif predicted_price >= 7000:
        return "Grade C"
    else:
        return "Grade D"

# Abbreviated zone label A/B/C/D for card badge
def _zone_label(predicted_price: float) -> str:
    if predicted_price >= 14000:
        return "A"
    elif predicted_price >= 10000:
        return "B"
    elif predicted_price >= 7000:
        return "C"
    else:
        return "D"

async def _get_ai_valuation(lat: float, lng: float, size_sqft: int = 1200) -> dict:
    """Generate AI valuation for a property based on its location."""
    try:
        if not _is_loaded or not lat or not lng:
            return None
        prediction = await get_prediction(lat, lng)
        price_per_sqft = round(prediction["predicted_price"], 2)
        total_value = round(price_per_sqft * size_sqft, 0)
        confidence = round(
            (prediction["infra_score"] + prediction["access_score"] + prediction["demand_score"]) / 3 * 100, 1
        )
        return {
            "predicted_price_per_sqft": price_per_sqft,
            "predicted_price_per_sqm": round(price_per_sqft * 10.764, 2),
            "total_estimated_value": total_value,
            "confidence": confidence,
            "market_tier": _zone_label(price_per_sqft),
            "infra_score": round(prediction["infra_score"] * 100, 1),
            "access_score": round(prediction["access_score"] * 100, 1),
            "demand_score": round(prediction["demand_score"] * 100, 1),
        }
    except Exception:
        return None

async def get_all_listings_service() -> list:
    """
    Returns all properties that are available for interaction in the marketplace.
    Includes listed, auction, verified, and owned assets.
    """
    from app.repository.user_repo import get_user_by_id
    all_props = await get_all_properties()

    # Marketplace must only display properties where: status = LISTED OR AUCTION
    marketable_props = [p for p in all_props if p.get("status") in ["listed", "auction"]]

    listings = []
    for idx, prop in enumerate(marketable_props):
        is_nft = bool(prop.get("is_nft", False))
        token_id = prop.get("nft_token_id")
        status = prop.get("status", "available")
        prop_id_str = str(prop.get("id"))
        lat = prop.get("latitude")
        lng = prop.get("longitude")
        chain = prop.get("chain", "polygon")

        # Fetch auction end time if property is in auction state
        auction_end_time = None
        if status == "auction":
            try:
                from app.repository.auction_repo import get_auctions_by_property
                auctions = await get_auctions_by_property(prop_id_str)
                active = [a for a in auctions if a.get("status") == "active"]
                if active:
                    end_time = active[0].get("end_time")
                    if end_time:
                        auction_end_time = end_time.isoformat() if hasattr(end_time, 'isoformat') else str(end_time)
            except Exception:
                pass

        # Fetch owner details for transparency
        owner_info = {"id": prop.get("owner_id"), "name": "Protocol", "wallet": None}
        if prop.get("owner_id"):
            try:
                user = await get_user_by_id(prop.get("owner_id"))
                if user:
                    owner_info = {
                        "id": str(user.get("_id")),
                        "name": user.get("full_name") or user.get("email") or "User",
                        "wallet": user.get("wallet_address")
                    }
            except:
                pass

        # INR display price from DB
        real_price = prop.get("price", 0)

        # MATIC on-chain price
        matic_price = prop.get("listing_price_matic") or prop.get("price_matic") or 0.0

        # We will collect these and run asyncio.gather below
        listings.append({
            "__lat": lat,
            "__lng": lng,
            "id": prop_id_str,
            "property_id": prop_id_str,
            "title": prop.get("title", "Premium Asset"),
            "address": prop.get("description", "Kolkata, WB")[:50],
            "price": real_price,
            "price_listed_matic": matic_price,
            "seller": prop.get("owner_id"),
            "owner": owner_info,
            "owner_id": prop.get("owner_id"),
            "is_nft": is_nft,
            "status": status,
            "chain": chain,
            "token_id": token_id if is_nft else None,
            "nft_token_id": token_id if is_nft else None,
            "location": {"lat": lat, "lng": lng},
            "image_url": prop.get("image_url") or (prop.get("images") and prop.get("images")[0]) or f"https://picsum.photos/seed/{1000 + idx}/800/600",
            "is_verified": bool(prop.get("is_verified", False) or (prop.get("verification_score") or 0) > 0.5),
            "verification_score": prop.get("verification_score"),
            "verification_hash": prop.get("verification_hash"),
            "auction_end_time": auction_end_time,
        })

    import asyncio
    
    async def enrich_ai(item):
        ai_val = await _get_ai_valuation(item["__lat"], item["__lng"])
        del item["__lat"]
        del item["__lng"]
        item["ai_valuation"] = ai_val
        # Compute grade label from AI valuation for the Grade badge
        if ai_val:
            item["tier"] = _classify_tier(ai_val.get("predicted_price_per_sqft", 0))
        else:
            item["tier"] = None
        return item
        
    listings = await asyncio.gather(*(enrich_ai(item) for item in listings))

    return listings


async def get_property_listing_service(token_id: int) -> dict:
    """
    Returns the on-chain listing status for a specific token.
    """
    nft_address = getattr(settings, "NFT_CONTRACT_ADDRESS", None)
    if not nft_address:
        return {"token_id": token_id, "active": False, "mode": "offline",
                "message": "NFT_CONTRACT_ADDRESS not configured."}

    on_chain = get_listing(nft_address, token_id)
    return {"token_id": token_id, **on_chain}

async def list_property_service(property_id: str, price_matic: float | None, price: float | None, current_user: dict) -> dict:
    """
    Backend-assisted listing: stores listing intent in MongoDB.
    The actual on-chain listing should be done by the frontend via MetaMask.
    This endpoint records the intent and returns the data needed for the frontend call.
    """
    prop = await get_property_by_id(property_id)
    if not prop:
        raise NotFoundError(detail="Property not found")

    if str(prop.get("owner_id")) != str(current_user["_id"]):
        raise AuthorizationError(detail="Only the owner can list this property")

    if not prop.get("nft_token_id") and prop.get("nft_token_id") != 0:
        raise ValidationError(detail="Property must be minted as NFT before listing")

    price_wei = int(price_matic * 1e18) if price_matic else 0
    nft_address = getattr(settings, "NFT_CONTRACT_ADDRESS", None)
    marketplace_address = getattr(settings, "MARKETPLACE_ADDRESS", None)

    # Resolve target chain from the property (fallback → polygon)
    target_chain = prop.get("chain") or "polygon"

    from app.services.property_state.property_state_controller import update_property_state
    from app.services.property_state.property_state_machine import PropertyEvent

    # Save listing intent to DB and run mandatory AI re-verification
    await update_property_state(
        PropertyEvent.LIST_CREATED,
        property_id,
        payload={
            "price_matic": price_matic,
            "price": price,
            "user_id": str(current_user["_id"])
        }
    )

    # Route backend-assisted sell execution via the hybrid chain router
    sell_result = await chain_sell(
        target_chain,
        {
            "nft_contract_address": nft_address or "",
            "token_id": prop.get("nft_token_id", 0),
            "price_wei": price_wei,
        },
    )

    return {
        "property_id": property_id,
        "nft_token_id": prop.get("nft_token_id"),
        "price_matic": price_matic,
        "price_wei": price_wei,
        "nft_contract_address": nft_address,
        "marketplace_contract_address": marketplace_address,
        "chain": sell_result.get("chain", target_chain),
        "chain_result": sell_result,
        "message": "Use this data to call listProperty() via MetaMask on the frontend.",
        "frontend_call": {
            "function": "listProperty",
            "args": [nft_address, prop.get("nft_token_id"), price_wei]
        }
    }
