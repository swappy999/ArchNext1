@echo off
echo ==============================================
echo STARTING ARCHNEXT FRONTEND
echo ==============================================
cd frontend
if exist node_modules (
    npm run dev
) else (
    echo [ERROR] Frontend node_modules not found.
    echo Running npm install first...
    npm install
    npm run dev
)
