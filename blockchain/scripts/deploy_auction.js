const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying PropertyAuction contract...");

    const dirFrontendContracts = path.join(__dirname, "../../frontend/contracts");
    const tokenAddrPath = path.join(dirFrontendContracts, "PropertyBiddingToken-address.json");
    let tokenAddress = "0x0000000000000000000000000000000000000000";

    if (fs.existsSync(tokenAddrPath)) {
        const tokenData = JSON.parse(fs.readFileSync(tokenAddrPath, "utf8"));
        tokenAddress = tokenData.address;
    }

    if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("PropertyBiddingToken is not deployed! Please deploy the token first.");
    }

    const PropertyAuction = await hre.ethers.getContractFactory("PropertyAuction");
    const auction = await PropertyAuction.deploy(tokenAddress);
    await auction.waitForDeployment();

    const auctionAddress = await auction.getAddress();
    console.log("PropertyAuction deployed to:", auctionAddress);

    // Save address to backend
    const backendPath = path.join(__dirname, "../../backend/auction_address.txt");
    fs.writeFileSync(backendPath, auctionAddress);
    console.log("Auction address saved to backend/auction_address.txt");

    // Save ABI to frontend
    const artifact = await hre.artifacts.readArtifact("PropertyAuction");
    const frontendContractsDir = path.join(__dirname, "../../frontend/contracts");

    if (!fs.existsSync(frontendContractsDir)) {
        fs.mkdirSync(frontendContractsDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(frontendContractsDir, "PropertyAuction.json"),
        JSON.stringify(artifact, null, 2)
    );
    fs.writeFileSync(
        path.join(frontendContractsDir, "PropertyAuction-address.json"),
        JSON.stringify({ address: auctionAddress }, null, 2)
    );
    console.log("Auction ABI and address synced to frontend/contracts/");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
