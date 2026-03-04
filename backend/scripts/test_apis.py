import asyncio
import httpx

async def test_backend_apis():
    print("Beginning Backend API Healthcheck...")
    base_url = "http://127.0.0.1:8000"
    
    async with httpx.AsyncClient() as client:
        # 1. Test Health
        try:
            r = await client.get(f"{base_url}/")
            print(f"Health check status: {r.status_code}")
        except Exception as e:
            print(f"Health check failed: {e}")
            
        # 2. Test Listings
        try:
            r = await client.get(f"{base_url}/marketplace/listings")
            print(f"Listings endpoint status: {r.status_code}")
            if r.status_code == 200:
                print(f" - Found {len(r.json())} listings")
        except Exception as e:
            print(f"Listings endpoint failed: {e}")
            
        # 3. Test Active Auctions
        try:
            r = await client.get(f"{base_url}/auction/active/all")
            print(f"Auctions endpoint status: {r.status_code}")
        except Exception as e:
            print(f"Auctions endpoint failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_backend_apis())
