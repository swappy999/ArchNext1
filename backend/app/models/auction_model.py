import uuid
from sqlalchemy import Column, String, Float, DateTime, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.models.base import Base
import enum


class AuctionStatus(str, enum.Enum):
    ACTIVE = "active"
    ENDED = "ended"
    FINALIZED = "finalized"
    CANCELLED = "cancelled"


class AuctionDB(Base):
    __tablename__ = "auctions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    seller_id = Column(String, nullable=False, index=True)
    on_chain_auction_id = Column(Integer, nullable=True)

    reserve_price = Column(Float, nullable=False)
    current_bid = Column(Float, default=0.0)
    highest_bidder = Column(String, nullable=True)
    min_bid_increment = Column(Float, default=0.0)

    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=False)
    status = Column(String, default=AuctionStatus.ACTIVE)
    bid_count = Column(Integer, default=0)
    tx_hash = Column(String, nullable=True) # Track the auction creation TX

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BidDB(Base):
    __tablename__ = "bids"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auction_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    bidder_id = Column(String, nullable=False)
    bidder_wallet = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    tx_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
