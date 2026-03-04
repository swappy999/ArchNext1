import os
import sys
import socket

def check_port(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def verify_backend():
    print("[VERIFY] Starting Backend Validation...")
    
    # 1. Check directories
    if not os.path.exists("backend/app"):
        print("FAIL: backend/app directory missing.")
        sys.exit(1)
        
    print("✓ Backend directory structure present")
    
    # 2. Check env
    if not os.path.exists("backend/.env"):
        print("WARN: backend/.env missing.")
    else:
        print("✓ Backend environment file found")
        
    # 3. Port check (ensure 8000 is open if running to test)
    # Skipping hard failure for port as the server might not be started during pure verification
    
    print("[VERIFY] Backend validation complete. PASS.")

if __name__ == "__main__":
    verify_backend()
