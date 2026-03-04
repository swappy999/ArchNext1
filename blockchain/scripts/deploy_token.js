const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying PropertyBiddingToken...");

    const PropertyBiddingToken = await hre.ethers.getContractFactory("PropertyBiddingToken");
    const token = await PropertyBiddingToken.deploy();
    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();
    console.log("PropertyBiddingToken deployed to:", tokenAddress);

    // Save ABI and Address to frontend
    const dirFrontendContracts = path.join(__dirname, "../../frontend/contracts");
    if (!fs.existsSync(dirFrontendContracts)) {
        fs.mkdirSync(dirFrontendContracts, { recursive: true });
    }

    fs.writeFileSync(
        path.join(dirFrontendContracts, "PropertyBiddingToken-address.json"),
        JSON.stringify({ address: tokenAddress }, null, 2)
    );

    const artifact = await hre.artifacts.readArtifact("PropertyBiddingToken");
    fs.writeFileSync(
        path.join(dirFrontendContracts, "PropertyBiddingToken.json"),
        JSON.stringify(artifact, null, 2)
    );

    console.log("Token ABI and address synced to frontend/contracts/");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
