import logging
from fastapi import HTTPException
from app.core.verification.errors.exceptions import AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError
from datetime import datetime
from app.repository.property_repo import get_property_by_id, update_property
from .property_state_machine import validate_transition, PropertyEvent
from .property_events import property_bus

logger = logging.getLogger(__name__)

async def update_property_state(event_type: PropertyEvent, property_id: str, payload: dict = None) -> dict:
    """
    CENTRAL CONTROLLER ENTRY POINT
    Enforces atomic lifecycle transitions and validation hooks. No module is allowed to bypass this.
    """
    payload = payload or {}
    
    # 1. READ state
    prop = await get_property_by_id(property_id)
    if not prop:
        raise NotFoundError(detail="Property not found in central state tree")
        
    current_status = prop.get("status", "draft")
    
    # 2. ENFORCE State Machine Check
    # Will raise HTTPException if the transition is explicitly blocked (e.g. SOLD -> LISTED)
    next_state = validate_transition(current_status, event_type)
    
    logger.info(f"Proceeding with Transition: {current_status} -> {next_state.value} via {event_type.value}")
    
    update_data = {}
    
    # 3. Validation HOOKS
    # E.g. AI Revalidation before LISTED / AUCTION / TRANSFER
    mandatory_verification_events = [
        PropertyEvent.LIST_CREATED, 
        PropertyEvent.AUCTION_STARTED, 
        PropertyEvent.PROPERTY_VERIFIED, 
        PropertyEvent.PROPERTY_SOLD, 
        PropertyEvent.OWNERSHIP_TRANSFERRED
    ]

    if event_type in mandatory_verification_events and not payload.get('skip_verification'):
        from app.services.verification_service import verify_property_for_listing
        asking_price = payload.get("price", prop.get("price", 0))
        verification_report = await verify_property_for_listing(property_id, asking_price)
        
        if not verification_report.get("can_list", False):
            risk_info = verification_report.get("risk_explanation", "Unknown Risk")
            score = verification_report.get("verification_score", 0.0)
            raise HTTPException(
                status_code=403, 
                detail=f"AI Transaction Blocked (Score: {score}). Restrictions: {risk_info}"
            )
            
        update_data["verification_hash"] = verification_report.get("verification_hash")
        update_data["verification_score"] = verification_report.get("verification_score")
        
    # 4. Field Modifications based on Transition
    if event_type == PropertyEvent.NFT_MINTED:
        if "nft_token_id" in payload:
            update_data["nft_token_id"] = payload["nft_token_id"]
            update_data["is_nft"] = 1.0
            update_data["on_chain"] = 1.0  # Mark as officially on-chain
        if "tx_hash" in payload:
            update_data["mint_tx_hash"] = payload["tx_hash"]

    elif event_type == PropertyEvent.LIST_CREATED:
        if "price_matic" in payload:
            update_data["listing_price_matic"] = payload["price_matic"]
            update_data["listing_price_wei"] = int(payload["price_matic"] * 1e18)
    
    elif event_type == PropertyEvent.PROPERTY_SOLD or event_type == PropertyEvent.OWNERSHIP_TRANSFERRED:
        new_owner = payload.get("buyer_id") or payload.get("winner_id")
        if not new_owner:
            raise ValueError(f"{event_type.value} requires buyer_id or winner_id in payload")
        update_data["owner_id"] = new_owner
        if "tx_hash" in payload:
            update_data["last_tx_hash"] = payload["tx_hash"]
        if "price_matic" in payload and payload["price_matic"] is not None:
            update_data["purchase_price_matic"] = payload["price_matic"]
        if "price" in payload and payload["price"] is not None:
            update_data["purchase_price"] = payload["price"]
            
    elif event_type == PropertyEvent.DELISTED:
        update_data["listing_price_matic"] = 0
        update_data["listing_price_wei"] = 0

    update_data["status"] = next_state.value
    update_data["updated_at"] = datetime.utcnow()
    
    # 5. ATOMIC COMMIT
    success = await update_property(property_id, update_data)
    if not success:
        raise HTTPException(status_code=500, detail="Database lock failure during atomic state transition")
        
    # 6. FIRE GLOBAL EVENT BUS
    resolved_payload = {
        "property_id": property_id,
        "event": event_type.value,
        "new_status": next_state.value,
        **payload
    }
    property_bus.emit(event_type, resolved_payload)
    
    return resolved_payload
