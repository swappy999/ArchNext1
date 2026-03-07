from fastapi import APIRouter, Depends, HTTPException
from app.core.verification.errors.exceptions import AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError
from fastapi import Query
from app.core.verification.middlewares.auth_checks import get_current_user
from app.services.property_service import create_property_service, verify_owner
from app.repository.property_repo import (
    get_all_properties, 
    get_nearby_properties, 
    filter_properties,
    get_property_by_id,
    update_property,
    delete_property_repo,
    tokenize_property
)
from app.schemas.property_schema import PropertyCreate, PropertyResponse, PropertyUpdate, PropertyTokenizeRequest
from typing import List, Optional

router = APIRouter()

@router.post("/", response_model=dict)
async def create_property(data: PropertyCreate,
                          current_user = Depends(get_current_user)):
    return await create_property_service(data, current_user)

@router.get("/", response_model=List[PropertyResponse])
async def get_properties():
    return await get_all_properties()

@router.get("/nearby", response_model=List[PropertyResponse])
async def nearby(
    longitude: float, 
    latitude: float, 
    radius: int = 2000
):
    return await get_nearby_properties(longitude, latitude, radius)

@router.get("/filter", response_model=List[PropertyResponse])
async def filter(
    min_price: Optional[float] = None, 
    max_price: Optional[float] = None
):
    return await filter_properties(min_price, max_price)

@router.get("/{id}", response_model=PropertyResponse)
async def get_property(id: str):
    prop = await get_property_by_id(id)
    if not prop:
        raise NotFoundError(detail="Property not found")
    
    # Enrich with AI valuation if coordinates exist
    if prop.get("latitude") and prop.get("longitude"):
        from app.services.marketplace_service import _get_ai_valuation
        prop["ai_valuation"] = await _get_ai_valuation(prop["latitude"], prop["longitude"])
        
    return prop

@router.put("/{id}", response_model=dict)
async def update_property_endpoint(
    id: str, 
    data: PropertyUpdate,
    current_user = Depends(get_current_user)
):
    # Check existence
    prop = await get_property_by_id(id)
    if not prop:
        raise NotFoundError(detail="Property not found")
    
    # Verify Owner
    verify_owner(prop, current_user)
    
    # Clean data
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    # Logic to handle lat/long update if present -> convert to location
    # (Simplified for now: just update other fields or handle loc if implemented in Repo)
    # The repo update generic dict. We need to handle location transformation here or in service.
    # User didn't strictly ask for Update logic for Geo, but good to have.
    # Ignoring Geo update for now to keep it simple as per prompt instructions.
    
    success = await update_property(id, update_data)
    if not success:
         raise HTTPException(status_code=500, detail="Update failed")
         
    return {"message": "Property updated successfully"}

@router.delete("/{id}", response_model=dict)
async def delete_property_endpoint(
    id: str,
    current_user = Depends(get_current_user)
):
    prop = await get_property_by_id(id)
    if not prop:
        raise NotFoundError(detail="Property not found")
        
    verify_owner(prop, current_user)
    
    success = await delete_property_repo(id)
    if not success:
        raise HTTPException(status_code=500, detail="Delete failed")
        
    return {"message": "Property deleted successfully"}

@router.post("/{id}/tokenize", response_model=dict)
async def tokenize_property_endpoint(
    id: str,
    data: PropertyTokenizeRequest,
    current_user = Depends(get_current_user)
):
    """
    Splits an existing property into fractional shares. Only available to the owner.
    """
    prop = await get_property_by_id(id)
    if not prop:
        raise NotFoundError(detail="Property not found")
        
    verify_owner(prop, current_user)
    
    # Needs to be whole properties that haven't been fractionalized yet
    if prop.get("is_fractional"):
        raise ValidationError(detail="Property is already tokenized into fractions.")

    success = await tokenize_property(
        property_id=id,
        owner_id=current_user["uid"],
        total_shares=data.total_shares,
        price_per_share=data.price_per_share
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to tokenize property.")
        
    return {
        "message": "Property successfully tokenized into fractions.",
        "fractionalized": True,
        "total_shares": data.total_shares,
        "price_per_share": data.price_per_share
    }

