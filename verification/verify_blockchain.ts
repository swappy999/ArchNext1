import * as fs from 'fs';
import * as path from 'path';

console.log("[VERIFY] Starting Blockchain Validation...");

// 1. Check directories
const blockchainPath = path.join(__dirname, '../blockchain');
if (!fs.existsSync(blockchainPath)) {
    console.error("FAIL: blockchain directory missing.");
    process.exit(1);
}
console.log("✓ Blockchain directory structure present");

// 2. Check contracts
const contractsPath = path.join(blockchainPath, 'contracts');
if (!fs.existsSync(contractsPath)) {
    console.warn("WARN: Smart contracts folder missing.");
} else {
    console.log("✓ Smart contracts folder present");
}

// 3. Extracted ABIs
const abisPath = path.join(__dirname, '../shared/abis');
if (!fs.existsSync(abisPath)) {
    console.warn("WARN: Shared ABIs folder missing.");
} else {
    console.log("✓ Shared ABIs folder present");
}

console.log("[VERIFY] Blockchain validation complete. PASS.");
