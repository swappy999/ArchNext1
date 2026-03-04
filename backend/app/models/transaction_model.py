import uuid
from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.models.base import Base

class NftTransactionDB(Base):
    __tablename__ = "nft_transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    chain = Column(String, nullable=False)
    tx_hash = Column(String, nullable=False, unique=True)
    tx_type = Column(String, nullable=False)
    from_wallet = Column(String, nullable=True)
    to_wallet = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class AuctionStateDB(Base):
    __tablename__ = "auction_states"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    start_price = Column(Float, nullable=False)
    current_bid = Column(Float, default=0.0)
    highest_bidder = Column(String, nullable=True)
    auction_end_time = Column(DateTime, nullable=False)
    status = Column(String, default="active")

class OwnershipHistoryDB(Base):
    __tablename__ = "ownership_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    previous_owner = Column(String, nullable=True)
    new_owner = Column(String, nullable=False)
    tx_hash = Column(String, nullable=True)
    chain = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
