import asyncio
import sys
import os
from datetime import datetime

# Ensure project root is in path
sys.path.append(os.getcwd())

from app.core.database import AsyncSessionLocal, engine
from app.models.property_model import PropertyDB
from app.models.base import Base

async def seed_market():
    print("Connecting to PostgreSQL to seed market data...")
    
    # Initialize tables just in case
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Initial Core Properties (Kolkata Data)
        properties = [
            {
                "title": "Quantum Heights - New Town",
                "description": "Premium 3BHK flat in the heart of New Town. AI Verified with 92% growth potential.",
                "price": 8500000,
                "latitude": 22.5867,
                "longitude": 88.4750,
                "owner_id": "0x1234567890abcdef1234567890abcdef12345678", # Mock Wallet
                "status": "listed",
                "is_nft": 1.0,
                "nft_token_id": 101,
                "blockchain_hash": "0xabc123"
            },
            {
                "title": "Hooghly View Residencies",
                "description": "Luxury apartment with stunning Hooghly river panoramic views. Located near BBD Bagh.",
                "price": 12500000,
                "latitude": 22.5726,
                "longitude": 88.3639,
                "owner_id": "0xabcdef1234567890abcdef1234567890abcdef12", # Mock Wallet 2
                "status": "listed",
                "is_nft": 1.0,
                "nft_token_id": 102,
                "blockchain_hash": "0xdef456"
            },
            {
                "title": "Salt Lake Sector V Tech Space",
                "description": "Premium open-plan commercial office space in the primary tech park. High yield growth zone.",
                "price": 45000000,
                "latitude": 22.5735,
                "longitude": 88.4331,
                "owner_id": "0x7890abcdef1234567890abcdef1234567890abcd", # Mock Wallet 3
                "status": "auction",
                "is_nft": 1.0,
                "nft_token_id": 103,
                "blockchain_hash": "0x789xyz"
            },
            {
                "title": "Heritage Bungalow - Ballygunge",
                "description": "Restored 1920s architecture bungalow in premium South Kolkata. Ideal for boutique conversion.",
                "price": 85000000,
                "latitude": 22.5280,
                "longitude": 88.3630,
                "owner_id": "0x9999abcdef1234567890abcdef1234567890abcd", # Mock Wallet 4
                "status": "verified", # Verified but not listed actively
                "is_nft": 1.0,
                "nft_token_id": 104,
                "blockchain_hash": "0xheritage123"
            }
        ]

        from sqlalchemy import select, delete

        for prop_data in properties:
            # Aggressively clear out the old versions (which might have been owned by 'admin')
            stmt = delete(PropertyDB).where(PropertyDB.title == prop_data["title"])
            await session.execute(stmt)
            
            # Insert the fresh mock property
            prop = PropertyDB(**prop_data)
            session.add(prop)
            print(f"Force Seeded: {prop_data['title']}")
        
        await session.commit()
    print("Market data seeded successfully (Old conflicting rows purged).")

if __name__ == "__main__":
    asyncio.run(seed_market())
