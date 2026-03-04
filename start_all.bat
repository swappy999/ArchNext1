@echo off
setlocal enabledelayedexpansion

:: Set colors for a premium terminal feel
color 0B
echo.
echo  █████╗ ██████╗  ██████╗██╗  ██╗███╗   ██╗███████╗██╗  ██╗████████╗
echo ██╔══██╗██╔══██╗██╔════╝██║  ██║████╗  ██║██╔════╝╚██╗██╔╝╚══██╔══╝
echo ███████║██████╔╝██║     ███████║██╔██╗ ██║█████╗   ╚███╔╝    ██║   
echo ██╔══██║██╔══██╗██║     ██╔══██║██║╚██╗██║██╔══╝   ██╔██╗    ██║   
echo ██║  ██║██║  ██║╚██████╗██║  ██║██║ ╚████║███████╗██╔╝ ██╗   ██║   
echo ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝   ╚═╝   
echo.
echo ─────────────────────────────────────────────────────────────────
echo  [SYSTEM] INITIALIZING ARCHON INTELLIGENCE ECOSYSTEM
echo ─────────────────────────────────────────────────────────────────

:: 0. Free Network Ports (Prevents Zombie Locks)
echo [0/5] Purging residual network locks (Ports 3000, 8000, 8545)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8545 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

:: 1. Database Health Check
echo [1/5] Verifying Cloud Intelligence Database...
cd backend
venv\Scripts\python.exe verify_db.py
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Database connection failed.
    pause
    exit /b
)

:: 2. Seed Market Data (Ensures Marketplace is never "Offline")
echo [2/5] Seeding Neural Market Intelligence (SQL)...
venv\Scripts\python.exe seed_market.py >nul 2>&1
cd ..

:: 3. Launch Blockchain
echo [3/5] Booting Local Blockchain Network (Port 8545)...
start "ArchNext - Blockchain Engine" cmd /k "cd blockchain && npx hardhat node"

:: 4. Launch Backend
echo [4/5] Powering up Hyper-Speed API (Port 8000)...
start "ArchNext - Backend Engine" cmd /k "cd backend && venv\Scripts\uvicorn.exe app.main:app --reload --host 0.0.0.0 --port 8000"

:: 5. Launch Frontend
echo [5/5] Synchronizing Neural Interface (Port 3000)...
start "ArchNext - Visual Core" cmd /k "cd frontend && npm run dev"

echo.
echo ─────────────────────────────────────────────────────────────────
echo [STATUS] SYSTEMS ACTIVE
echo - Backend:    http://localhost:8000
echo - Frontend:   http://localhost:3000
echo - Blockchain: http://localhost:8545 (Hardhat)
echo ─────────────────────────────────────────────────────────────────
echo.
echo Core orchestration complete. Keep this terminal open.
echo To terminate all sessions, press any key...
pause >nul
taskkill /F /FI "WINDOWTITLE eq ArchNext*" /T >nul 2>&1
