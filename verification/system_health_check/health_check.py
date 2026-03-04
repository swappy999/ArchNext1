import urllib.request
import sys
import socket

def print_result(module, status, detail=""):
    color = "\033[92m" if status == "PASS" else "\033[91m"
    end = "\033[0m"
    print(f"{module.ljust(20)} [{color}{status}{end}] {detail}")

def check_port(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(('127.0.0.1', port)) == 0

def check_backend():
    # Check if backend port 8000 is locally open
    if check_port(8000):
        try:
            res = urllib.request.urlopen("http://127.0.0.1:8000/", timeout=2)
            if res.status == 200:
                print_result("Backend (API)", "PASS", "HTTP 200 OK")
                return True
        except Exception:
            pass
            
    print_result("Backend (API)", "FAIL", "Port 8000 down or not responding")
    return False

def check_frontend():
    # Next.js running on 3000
    if check_port(3000):
        try:
            # Note Nextjs might take a while to compile on 1st request
            res = urllib.request.urlopen("http://127.0.0.1:3000/", timeout=3)
            print_result("Frontend (UI)", "PASS", f"HTTP {res.status}")
            return True
        except Exception as e:
            if "HTTP Error" in str(e):
                print_result("Frontend (UI)", "PASS", str(e))
                return True
    
    print_result("Frontend (UI)", "FAIL", "Port 3000 down or unreachable")
    return False

def check_blockchain():
    # Hardhat or local RPC usually at 8545
    if check_port(8545):
        print_result("Blockchain (RPC)", "PASS", "Port 8545 active")
        return True
    else:
        print_result("Blockchain (RPC)", "FAIL", "Node is not active")
        return False

def run_health_check():
    print("\n" + "="*50)
    print("ARCHNEXT SYSTEM HEALTH REPORT")
    print("="*50 + "\n")
    
    b_ok = check_backend()
    f_ok = check_frontend()
    c_ok = check_blockchain()
    
    print("\n" + "="*50)
    if b_ok and f_ok and c_ok:
        print("OVERALL STATUS: ALL SYSTEMS NOMINAL")
        sys.exit(0)
    else:
        print("OVERALL STATUS: DEGRADED (Check failed modules)")
        sys.exit(1)

if __name__ == "__main__":
    run_health_check()
