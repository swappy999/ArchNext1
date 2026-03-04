import urllib.request

def test_backend_auth_connection():
    print("[TEST 1] Auth -> Backend connection")
    try:
        response = urllib.request.urlopen("http://127.0.0.1:8000/")
        if response.status == 200:
            print("✓ Backend is reachable.")
        else:
            print(f"WARN: Backend returned status {response.status}")
    except Exception as e:
        print(f"FAIL: Could not reach backend. Is it running? Error: {e}")

if __name__ == "__main__":
    test_backend_auth_connection()
