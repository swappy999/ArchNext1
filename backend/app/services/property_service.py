from app.models.property_model import Property
from fastapi import HTTPException
from app.core.verification.errors.exceptions import AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError
from app.integrations.mapbox import geocode_address
from app.integrations.blockchain import generate_property_hash
from app.integrations.property_nft import mint_property_nft
from datetime import datetime
from app.repository.property_repo import create_property, update_property

def verify_owner(property_data: dict, current_user: dict):
    if str(property_data["owner_id"]) != str(current_user["_id"]):
        raise AuthorizationError(detail="Not authorized to edit this property")

async def create_property_service(data, current_user):

    property_data = data.dict()
    
    # 1. Transform lat/long to GeoJSON Point (Legacy input)
    if "longitude" in property_data and "latitude" in property_data:
        property_data["location"] = {
            "type": "Point",
            "coordinates": [
                property_data.pop("longitude"),
                property_data.pop("latitude")
            ]
        }
        
    # 2. Mapbox Auto-Geocoding (Address Input)
    if property_data.get("address") and not property_data.get("location"):
        coords = await geocode_address(property_data["address"])
        if coords:
            property_data["location"] = {
                "type": "Point",
                "coordinates": [coords["longitude"], coords["latitude"]]
            }
            property_data["latitude"] = coords["latitude"]
            property_data["longitude"] = coords["longitude"]
    
    # 3. Apply Defaults & Owner
    property_data["owner_id"] = str(current_user["_id"])
    property_data["created_at"] = datetime.utcnow()
    
    # 4. Extract optional wallet address (for NFT auto-mint)
    owner_wallet = property_data.pop("owner_wallet", None)
    
    # 5. Save to DB
    new_id = await create_property(property_data)
    property_id = str(new_id)
    
    response = {
        "message": "Property created successfully",
        "id": property_id
    }
    
    # 6. Optional: Auto-mint NFT if wallet address provided
    if owner_wallet:
        property_hash = generate_property_hash({**property_data, "id": property_id})
        nft_result = mint_property_nft(owner_wallet, property_hash, property_id)
        
        # Store NFT data in DB
        nft_update = {
            "property_hash": property_hash,
            "owner_wallet": owner_wallet,
            "nft_minted": nft_result["success"],
            "nft_mode": nft_result["mode"]
        }
        if nft_result.get("tx_hash"):
            nft_update["nft_tx"] = nft_result["tx_hash"]
        if nft_result.get("token_id") is not None:
            nft_update["nft_token_id"] = nft_result["token_id"]
        
        await update_property(property_id, nft_update)
        response["nft"] = nft_result
    
    return response
