import asyncio
import httpx
import sys
import os

BASE_URL = "http://127.0.0.1:8000"

async def audit_logic():
    print("--- ArchNext E2E Logic Audit ---")
    async with httpx.AsyncClient() as client:
        # 1. Fetch Listings
        print("1. Fetching Marketplace Listings...")
        resp = await client.get(f"{BASE_URL}/marketplace/listings")
        if resp.status_code != 200:
            print(f"FAILED: Listings endpoint returned {resp.status_code}")
            return
        
        listings = resp.json()
        print(f"SUCCESS: Found {len(listings)} listings")
        
        if not listings:
            print("FAILED: No listings found to audit.")
            return

        # 2. Pick First Listing and Audit Deep Details
        listing_id = listings[0]["id"]
        print(f"2. Auditing Property ID: {listing_id}")
        
        detail_resp = await client.get(f"{BASE_URL}/marketplace/property/{listing_id}")
        if detail_resp.status_code != 200:
            # Try alternate route if /marketplace/property fails
            detail_resp = await client.get(f"{BASE_URL}/properties/{listing_id}")
            
        if detail_resp.status_code != 200:
            print(f"FAILED: Detail endpoint returned {detail_resp.status_code}")
        else:
            detail = detail_resp.json()
            print("SUCCESS: Detail endpoint responsive")
            
            # Check for AI Valuation
            if "valuation" in detail or "ai_valuation" in detail:
                 print("SUCCESS: AI Valuation data present")
            else:
                 print("WARNING: AI Valuation object not found in detail response")
            
            # Check for coordinates (Property Map requirement)
            if "latitude" in detail and "longitude" in detail:
                 print(f"SUCCESS: Geo-coordinates found ({detail['latitude']}, {detail['longitude']})")
            else:
                 print("FAILED: Geo-coordinates missing (Critical for Property Map)")

        # 3. Check Auctions
        print("3. Auditing Auctions...")
        auction_resp = await client.get(f"{BASE_URL}/auction/active/all")
        if auction_resp.status_code == 200:
             auctions = auction_resp.json()
             print(f"SUCCESS: Found {len(auctions)} active auctions")
        else:
             print(f"FAILED: Auction endpoint returned {auction_resp.status_code}")

if __name__ == "__main__":
    asyncio.run(audit_logic())
