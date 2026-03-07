"""
Development-only seed endpoint.
Seeds realistic Kolkata marketplace properties assigned to the current logged-in user.
Access: POST /dev/seed-market  (requires auth token)
"""
from fastapi import APIRouter, Depends
from app.core.verification.middlewares.auth_checks import get_current_user
from app.repository.property_repo import create_property, get_all_properties
from sqlalchemy import delete
from app.core.database import AsyncSessionLocal
from app.models.property_model import PropertyDB

router = APIRouter(prefix="/dev", tags=["Dev Tools"])

SEED_PROPERTIES = [
    {
        "title": "Quantum Heights — New Town",
        "description": "Premium 3BHK in the heart of New Town. AI Verified 92% growth potential. Direct metro access.",
        "price": 8500000,
        "latitude": 22.5867,
        "longitude": 88.4750,
        "status": "listed",
        "is_nft": 1.0,
        "nft_token_id": 201,
        "blockchain_hash": "0xabc123seed",
        "is_verified": True,
        "verification_score": 0.92,
        "chain": "polygon",
        "listing_price_matic": 1.5,
    },
    {
        "title": "Hooghly View Residencies",
        "description": "Luxury apartment with stunning Hooghly river panoramic views. Near BBD Bagh.",
        "price": 12500000,
        "latitude": 22.5726,
        "longitude": 88.3639,
        "status": "listed",
        "is_nft": 1.0,
        "nft_token_id": 202,
        "blockchain_hash": "0xdef456seed",
        "is_verified": True,
        "verification_score": 0.88,
        "chain": "polygon",
        "listing_price_matic": 2.2,
    },
    {
        "title": "Salt Lake Sector V Tech Space",
        "description": "Premium open-plan commercial office in the primary tech park. High yield growth zone.",
        "price": 45000000,
        "latitude": 22.5735,
        "longitude": 88.4331,
        "status": "auction",
        "is_nft": 1.0,
        "nft_token_id": 203,
        "blockchain_hash": "0x789xyzseed",
        "is_verified": True,
        "verification_score": 0.95,
        "chain": "polygon",
        "listing_price_matic": 8.0,
    },
    {
        "title": "Heritage Bungalow — Ballygunge",
        "description": "Restored 1920s architecture bungalow in premium South Kolkata. Ideal for boutique conversion.",
        "price": 85000000,
        "latitude": 22.5280,
        "longitude": 88.3630,
        "status": "listed",
        "is_nft": 1.0,
        "nft_token_id": 204,
        "blockchain_hash": "0xheritage123seed",
        "is_verified": True,
        "verification_score": 0.96,
        "chain": "algorand",
        "listing_price_matic": 15.0,
    },
    {
        "title": "Rajarhat Smart Loft",
        "description": "Smart home-enabled studio loft near IT corridors. Energy-efficient IoT-integrated systems.",
        "price": 4200000,
        "latitude": 22.6193,
        "longitude": 88.4726,
        "status": "listed",
        "is_nft": 1.0,
        "nft_token_id": 205,
        "blockchain_hash": "0xrajarhat205seed",
        "is_verified": True,
        "verification_score": 0.82,
        "chain": "polygon",
        "listing_price_matic": 0.75,
    },
    {
        "title": "Park Street Commercial Tower",
        "description": "Grade A commercial space in Kolkata's most prestigious business district. LEED Certified.",
        "price": 320000000,
        "latitude": 22.5490,
        "longitude": 88.3590,
        "status": "auction",
        "is_nft": 1.0,
        "nft_token_id": 206,
        "blockchain_hash": "0xparkstreet206seed",
        "is_verified": True,
        "verification_score": 0.99,
        "chain": "polygon",
        "listing_price_matic": 55.0,
    },
]


@router.post("/seed-market")
async def seed_marketplace(current_user: dict = Depends(get_current_user)):
    """
    Seeds 6 realistic Kolkata marketplace properties assigned to the current user.
    Purges any previously seeded properties with the same token IDs first.
    """
    user_id = str(current_user.get("_id", current_user.get("id", "")))
    if not user_id or user_id == "None":
        return {"error": "User ID not resolved. Please log in."}

    seeded_token_ids = [p["nft_token_id"] for p in SEED_PROPERTIES]

    # Purge any old seeded rows with conflicting token IDs
    async with AsyncSessionLocal() as session:
        stmt = delete(PropertyDB).where(PropertyDB.nft_token_id.in_(seeded_token_ids))
        await session.execute(stmt)
        await session.commit()

    # Insert fresh properties owned by the current user
    created = []
    for prop_data in SEED_PROPERTIES:
        data = {**prop_data, "owner_id": user_id}
        created_prop = await create_property(data)
        created.append({"title": data["title"], "status": data["status"], "id": created_prop.get("id")})

    return {
        "message": f"✅ Seeded {len(created)} marketplace properties assigned to user {user_id}",
        "properties": created,
        "instructions": (
            "Refresh the Marketplace and Portfolio pages to see results. "
            "If AI valuation is slow, wait ~3s after seeding."
        ),
    }
