@echo off
echo ==============================================
echo BOOTING ARCHNEXT FULLSTACK
echo ==============================================
echo Launching Backend...
start cmd /k "start_backend.bat"

echo Launching Blockchain...
start cmd /k "start_blockchain.bat"

echo Launching Frontend...
start cmd /k "start_frontend.bat"

echo All services dispatched to separate windows.
pause
