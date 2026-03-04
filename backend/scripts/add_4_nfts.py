import asyncio
import uuid
import json
from sqlalchemy import text
from app.core.database import engine

async def add_4_nfts():
    print("Seeding 4 NFT Properties for Polygon Amoy Hybrid verification...")
    try:
        inserted = 0
        owner_id = "ai-market-001"
        
        properties_data = [
            {"title": "Amoy Test Villa 1", "lat": 22.5, "lng": 88.3},
            {"title": "Amoy Test Condo 2", "lat": 22.6, "lng": 88.4},
            {"title": "Amoy Test Estate 3", "lat": 22.55, "lng": 88.35},
            {"title": "Amoy Test Studio 4", "lat": 22.45, "lng": 88.25}
        ]
        
        async with engine.begin() as conn:
            for prop in properties_data:
                prop_id = str(uuid.uuid4())
                await conn.execute(
                    text("""
                    INSERT INTO properties (
                        id, title, description, price, latitude, longitude, 
                        owner_id, images, features, status, predicted_price, is_verified, is_nft,
                        listing_price_matic, listing_price_wei, chain, on_chain
                    ) VALUES (
                        :id, :title, :description, :price, :latitude, :longitude, 
                        :owner_id, :images, :features, :status, :predicted_price, :is_verified, :is_nft,
                        :listing_price_matic, :listing_price_wei, :chain, :on_chain
                    )
                    """),
                    {
                        "id": prop_id, 
                        "title": prop["title"], 
                        "description": "Polygon Amoy verified asset for transaction testing.", 
                        "price": 0.00001, 
                        "latitude": prop["lat"], 
                        "longitude": prop["lng"], 
                        "owner_id": owner_id, 
                        "images": json.dumps(["https://source.unsplash.com/800x600/?mansion"]), 
                        "features": json.dumps(["Polygon Connected"]), 
                        "status": "available", 
                        "predicted_price": 0.00001, 
                        "is_verified": 1.0,
                        "is_nft": 1.0,
                        "listing_price_matic": 0.00001,
                        "listing_price_wei": 10000000000000.0,
                        "chain": "polygon",
                        "on_chain": 1.0
                    }
                )
                inserted += 1
                
        print(f"Successfully inserted {inserted} NFT properties priced at 0.00001 POL.")
    except Exception as e:
        print(f"Failed to seed properties: {e}")

if __name__ == "__main__":
    asyncio.run(add_4_nfts())
