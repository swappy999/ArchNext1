const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("[VERIFY] Starting Frontend Validation...");

// 1. Check directories
const frontendPath = path.join(__dirname, '../frontend');
if (!fs.existsSync(frontendPath) || !fs.existsSync(path.join(frontendPath, 'package.json'))) {
    console.error("FAIL: frontend directory or package.json missing.");
    process.exit(1);
}
console.log("✓ Frontend directory structure present");

// 2. Check dependencies installed
if (!fs.existsSync(path.join(frontendPath, 'node_modules'))) {
    console.warn("WARN: node_modules missing. You may need to run npm install.");
} else {
    console.log("✓ node_modules present");
}

console.log("[VERIFY] Frontend validation complete. PASS.");
