import uuid
from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.models.base import Base

class EscrowDB(Base):
    """
    Tracks locked funds/tokens during auctions or fractional purchases.
    Status can be: pending, completed, refunded, failed
    """
    __tablename__ = "escrows"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(String, index=True)
    buyer_wallet = Column(String, index=True)
    amount = Column(Float, nullable=False)
    status = Column(String, default="pending", index=True)
    lock_expiry = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
