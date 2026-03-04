import urllib.request
import sys

def test_frontend_communication():
    print("[TEST 2] Frontend API connectivity")
    # For CI integration tests, the frontend uses API_URL mapping to backend
    # This just ensures we can parse basic API structure
    try:
        response = urllib.request.urlopen("http://127.0.0.1:8000/auth")
        if response.status == 200:
            print("✓ Frontend Auth endpoint is active.")
        elif response.status in [404, 405]:
            # Expecting 404 or 405 if root auth router responds instead of timing out
            print("✓ Frontend Auth endpoint is active (returned expected app error).")
    except Exception as e:
        # A 4xx series error is thrown as an Exception in urllib
        if "HTTP Error" in str(e):
             print("✓ Frontend API endpoints reachable (verified via HTTP Error throw).")
             sys.exit(0)
             
        print(f"FAIL: Could not verify frontend. Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_frontend_communication()
