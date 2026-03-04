import uuid
from sqlalchemy import Column, String, Float, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.models.base import Base

class PropertyDB(Base):
    __tablename__ = "properties"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String)
    description = Column(String)
    price = Column(Float)
    latitude = Column(Float)
    longitude = Column(Float)
    owner_id = Column(String, index=True)
    blockchain_hash = Column(String, nullable=True)
    images = Column(JSON, default=list)
    features = Column(JSON, default=list)
    status = Column(String, default="available", index=True)
    nft_token_id = Column(Float, nullable=True) # Will use Float for token ID to match sqlite/postgres laxness or Integer
    is_nft = Column(Float, default=0.0) # Actually we can just use Float and treat 1.0 as true or use Boolean
    predicted_price = Column(Float, nullable=True)
    is_verified = Column(Float, default=0.0, index=True)
    
    # Marketplace / Auction / Verification Extensions
    listing_price_matic = Column(Float, default=0.0)
    listing_price_wei = Column(Float, default=0.0) # Using Float for BigInt approximation or just storing large numbers
    purchase_price = Column(Float, nullable=True)
    purchase_price_matic = Column(Float, nullable=True)
    verification_hash = Column(String, nullable=True)
    verification_score = Column(Float, nullable=True)
    last_tx_hash = Column(String, nullable=True)
    owner_wallet = Column(String, nullable=True)

    # ── Multi-Chain Support (backward-compatible: all nullable, default polygon) ──
    chain = Column(String, nullable=True, default="polygon")  # target execution chain
    contract_address = Column(String, nullable=True)          # per-property contract override
    token_id = Column(String, nullable=True)                  # generalized cross-chain token id
    mint_tx_hash = Column(String, nullable=True)
    nft_metadata_hash = Column(String, nullable=True)
    on_chain = Column(Float, default=0.0) # Using float representing boolean (as with is_nft) to avoid import issues

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Property(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    price: float
    area_sqft: float = 1200.0
    location: dict
    owner_id: str
    blockchain_hash: Optional[str] = None
    images: List[str] = []
    features: List[str] = []
    status: str = "available"
    predicted_price: Optional[float] = None
    is_verified: bool = False
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    class Config:
        from_attributes = True
        arbitrary_types_allowed = True
