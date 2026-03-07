import uuid
from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.models.base import Base

class ShareholderDB(Base):
    """
    Tracks who owns what percentage/shares of a fractionally tokenized property.
    """
    __tablename__ = "shareholders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(String, index=True)
    wallet_address = Column(String, index=True)
    shares_owned = Column(Float, default=0.0)
    purchase_price = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
