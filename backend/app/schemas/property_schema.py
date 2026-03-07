from pydantic import BaseModel, validator
from typing import List, Optional, Dict
from datetime import datetime

class PropertyBase(BaseModel):
    title: str
    description: str
    price: float
    images: Optional[List[str]] = []
    features: Optional[List[str]] = []

    @validator("images", "features", pre=True, always=True)
    def clean_null_lists(cls, v):
        return v if v is not None else []

class PropertyCreate(PropertyBase):
    latitude: float
    longitude: float
    predicted_price: Optional[float] = None
    is_verified: bool = False

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    # Updates to location would require lat/long inputs again
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    images: Optional[List[str]] = None
    features: Optional[List[str]] = None
    status: Optional[str] = None

class PropertyTokenizeRequest(BaseModel):
    total_shares: int
    price_per_share: float

class PropertyResponse(PropertyBase):
    id: str
    owner_id: str
    location: Dict
    latitude: float
    longitude: float
    blockchain_hash: Optional[str] = None
    status: str
    is_nft: bool = False
    nft_token_id: Optional[int] = None
    predicted_price: Optional[float] = None
    ai_valuation: Optional[Dict] = None
    is_verified: bool = False
    
    # Fractional Tokenization
    is_fractional: bool = False
    total_shares: int = 1
    available_shares: int = 1
    price_per_share: Optional[float] = None
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # We can also expose lat/long as computed fields if needed, 
    # but returning raw location is fine for now.

    class Config:
        from_attributes = True
