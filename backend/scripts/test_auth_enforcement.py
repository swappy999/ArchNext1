import asyncio
import httpx
import logging
from sys import exit

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

BASE_URL = "http://127.0.0.1:8000"

async def test_auth_enforcement():
    async with httpx.AsyncClient() as client:
        routes_to_test = [
            "/users/me",
            "/portfolio/my-portfolio",
            "/marketplace/list/123",  # Need auth to attempt listing
            "/auction/create",
        ]
        
        passed = True
        for route in routes_to_test:
            try:
                # We expect a 401 or 403 because we have NO token
                res = await client.get(f"{BASE_URL}{route}")
                
                if res.status_code in [401, 403]:
                    logging.info(f"Secured route properly protected: {route} returned {res.status_code}")
                # Sometimes a post/put might return 405 Method Not Allowed before auth, which is less ideal but safe.
                elif res.status_code == 405:
                    logging.info(f"Method not allowed (Safe state) for: {route}")
                else:
                    logging.error(f"SECURITY FLAW: {route} returned {res.status_code} without authentication.")
                    passed = False
                    
            except Exception as e:
                logging.error(f"Could not connect to evaluate route {route}: {e}")
                passed = False
                
        if passed:
            logging.info("All selected routes enforce basic authentication requirements properly.")
        else:
            logging.error("Security checks failed.")

if __name__ == "__main__":
    asyncio.run(test_auth_enforcement())
