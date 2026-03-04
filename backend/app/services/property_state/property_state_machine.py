from enum import Enum
from fastapi import HTTPException
from app.core.verification.errors.exceptions import AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError
import logging

logger = logging.getLogger(__name__)

class PropertyState(str, Enum):
    DRAFT = "draft"
    AI_VERIFIED = "verified"
    NFT_MINTED = "minted"
    OWNED = "owned"
    LISTED = "listed"
    AUCTION_ACTIVE = "auction"
    SOLD = "sold"
    TRANSFERRED = "transferred"
    AVAILABLE = "available"

class PropertyEvent(str, Enum):
    PROPERTY_VERIFIED = "PROPERTY_VERIFIED"
    NFT_MINTED = "NFT_MINTED"
    LIST_CREATED = "LIST_CREATED"
    AUCTION_STARTED = "AUCTION_STARTED"
    BID_PLACED = "BID_PLACED"
    PROPERTY_SOLD = "PROPERTY_SOLD"
    OWNERSHIP_TRANSFERRED = "OWNERSHIP_TRANSFERRED"
    DELISTED = "DELISTED"

# The Strict Directed Graph of Allowed State Transitions
# Format: { CurrentState: { EventTrigger: NextState } }
ALLOWED_TRANSITIONS = {
    PropertyState.DRAFT: {
        PropertyEvent.PROPERTY_VERIFIED: PropertyState.AI_VERIFIED
    },
    PropertyState.AI_VERIFIED: {
        PropertyEvent.NFT_MINTED: PropertyState.NFT_MINTED
    },
    PropertyState.NFT_MINTED: {
        PropertyEvent.OWNERSHIP_TRANSFERRED: PropertyState.OWNED
    },
    PropertyState.OWNED: {
        PropertyEvent.LIST_CREATED: PropertyState.LISTED,
        PropertyEvent.AUCTION_STARTED: PropertyState.AUCTION_ACTIVE,
        PropertyEvent.OWNERSHIP_TRANSFERRED: PropertyState.OWNED # Transferred ownership between wallets but staying OWNED
    },
    PropertyState.LISTED: {
        PropertyEvent.PROPERTY_SOLD: PropertyState.SOLD,
        PropertyEvent.DELISTED: PropertyState.OWNED
    },
    PropertyState.AUCTION_ACTIVE: {
        PropertyEvent.PROPERTY_SOLD: PropertyState.SOLD,
        PropertyEvent.DELISTED: PropertyState.OWNED # e.g. cancelled auction
    },
    PropertyState.SOLD: {
        PropertyEvent.OWNERSHIP_TRANSFERRED: PropertyState.OWNED,
        PropertyEvent.AUCTION_STARTED: PropertyState.AUCTION_ACTIVE,
        PropertyEvent.LIST_CREATED: PropertyState.LISTED
    },
    PropertyState.AVAILABLE: {
        PropertyEvent.LIST_CREATED: PropertyState.LISTED,
        PropertyEvent.AUCTION_STARTED: PropertyState.AUCTION_ACTIVE,
        PropertyEvent.OWNERSHIP_TRANSFERRED: PropertyState.OWNED
    },
    PropertyState.TRANSFERRED: {
        # Reserved for bridging
    }
}

# In this application, due to some legacy property seed data, we must gracefully handle uninitialized statuses.
def normalize_status(current_status: str) -> PropertyState:
    if not current_status:
        return PropertyState.DRAFT
    if current_status == "available":
        return PropertyState.AVAILABLE
    try:
        return PropertyState(current_status)
    except ValueError:
        return PropertyState.DRAFT

def validate_transition(current_status: str, event: PropertyEvent) -> PropertyState:
    state = normalize_status(current_status)
    
    allowed_events = ALLOWED_TRANSITIONS.get(state, {})
    
    # We must also support a "fast-track" from DRAFT -> LISTED for legacy UI flows/seeds
    if state == PropertyState.DRAFT and event == PropertyEvent.LIST_CREATED:
        return PropertyState.LISTED
    if state == PropertyState.DRAFT and event == PropertyEvent.AUCTION_STARTED:
        return PropertyState.AUCTION_ACTIVE
    if state == PropertyState.DRAFT and event == PropertyEvent.OWNERSHIP_TRANSFERRED:
        return PropertyState.OWNED
        
    next_state = allowed_events.get(event)
    
    if not next_state:
        logger.error(f"ILLEGAL TRANSITION BLOCKED: attempt to trigger {event.value} from state {state.value}")
        raise HTTPException(
            status_code=400,
            detail=f"State machine violation: Cannot transition from {state.value} via {event.value}."
        )
        
    return next_state
