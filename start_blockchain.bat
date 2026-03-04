@echo off
echo ==============================================
echo STARTING ARCHNEXT BLOCKCHAIN
echo ==============================================
cd blockchain
echo Expected hardhat node...
if exist node_modules (
    npx hardhat node
) else (
    echo [ERROR] Blockchain node_modules not found.
    echo Running npm install first...
    npm install
    npx hardhat node
)
