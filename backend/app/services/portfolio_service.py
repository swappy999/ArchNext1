from app.repository.property_repo import get_all_properties
from app.integrations.marketplace import get_listing
from app.integrations.property_nft import get_nft_owner
from app.services.prediction_service import predict_property_service
from app.core.config import settings


async def get_portfolio(current_user: dict) -> dict:
    """
    Returns a full portfolio view for the authenticated user.

    For each owned property:
    - NFT ownership status (on-chain)
    - Active marketplace listing (price, active)
    - AI price prediction (predicted value, growth %)

    Aggregates:
    - total_properties
    - total_current_value
    - total_predicted_value
    - portfolio_growth_percent
    """
    user_id = str(current_user.get("_id", current_user.get("id")))
    wallet = (current_user.get("wallet_address") or "").lower()

    # 1. Fetch all user-owned properties (check by ID or Wallet)
    all_props = await get_all_properties()
    owned = []
    for p in all_props:
        p_owner = str(p.get("owner_id", "")).lower()
        if p_owner == user_id.lower() or (wallet and p_owner == wallet):
            owned.append(p)

    nft_address = getattr(settings, "NFT_CONTRACT_ADDRESS", None)

    portfolio_items = []
    total_current = 0
    total_predicted = 0

    for prop in owned:
        prop_id = prop.get("id") or str(prop.get("_id"))
        token_id = prop.get("nft_token_id")
        current_price = prop.get("price", 0)

        # On-chain NFT status
        nft_status = {}
        if token_id is not None and nft_address:
            nft_status = get_nft_owner(token_id)

        # Marketplace listing status
        listing_status = {}
        if token_id is not None and nft_address:
            listing_status = get_listing(nft_address, token_id)

        # AI Prediction (graceful — never crash portfolio on AI failure)
        prediction = {}
        try:
            pred_result = await predict_property_service(prop_id)
            prediction = pred_result.get("prediction", {})
            predicted_price = prediction.get("predicted_price", current_price)
        except Exception:
            predicted_price = current_price

        total_current += current_price
        total_predicted += predicted_price

        portfolio_items.append({
            "property_id": prop_id,
            "title": prop.get("title", "Unnamed Property"),
            "address": prop.get("address") or prop.get("description", "")[:60],
            "current_price": current_price,
            "current_value": current_price,
            "purchase_price": prop.get("purchase_price", current_price),
            "purchase_price_matic": prop.get("purchase_price_matic"),
            "predicted_price": predicted_price,
            "growth_percent": prediction.get("growth_percent", 0),
            "location": prop.get("location"),
            "latitude": prop.get("latitude"),
            "longitude": prop.get("longitude"),
            "is_nft": bool(prop.get("is_nft", False) or token_id is not None),
            "nft_minted": prop.get("nft_minted", False),
            "nft_token_id": token_id,
            "nft_tx": prop.get("nft_tx"),
            "owner_wallet": prop.get("owner_wallet"),
            "nft_on_chain": nft_status,
            "listed_for_sale": listing_status.get("active", False) or prop.get("status") == "listed",
            "listing_price_matic": listing_status.get("price_matic") or prop.get("listing_price_matic", 0),
            "price_listed_matic": listing_status.get("price_matic") or prop.get("listing_price_matic", prop.get("price_matic", 0)),
            "marketplace": listing_status,
            "blockchain_verified": prop.get("blockchain_verified", False),
            "property_hash": prop.get("property_hash"),
            "chain": prop.get("chain", "polygon"),
            "status": prop.get("status", "draft"),
            "is_verified": bool(prop.get("is_verified", False) or (prop.get("verification_score") or 0) > 0.5),
            "image_url": prop.get("image_url"),
        })

    # Always fetch auctions and bids — even if no directly-owned properties
    from app.repository.auction_repo import get_auctions_by_user, get_bids_by_user
    active_auctions = await get_auctions_by_user(user_id, wallet=wallet)
    my_bids = await get_bids_by_user(user_id, wallet=wallet)

    # Portfolio aggregates
    growth_pct = 0
    if total_current > 0:
        growth_pct = round(((total_predicted - total_current) / total_current) * 100, 2)

    return {
        "user_id": user_id,
        "total_properties": len(portfolio_items),
        "total_current_value": round(total_current, 2),
        "total_predicted_value": round(total_predicted, 2),
        "portfolio_growth_percent": growth_pct,
        "properties": portfolio_items,
        "active_auctions": active_auctions,
        "my_bids": my_bids,
    }
