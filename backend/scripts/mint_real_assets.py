import os
import asyncio
import json
from web3 import Web3
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Load ENV
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

# Web3 and Contract Setup
w3 = Web3(Web3.HTTPProvider(os.getenv("POLYGON_RPC", "http://127.0.0.1:8545")))

# Load ABIs and Addresses
contracts_dir = os.path.join(os.path.dirname(__file__), "../contracts")
with open(os.path.join(contracts_dir, "nft_address.txt")) as f:
    nft_address = f.read().strip()
with open(os.path.join(contracts_dir, "marketplace_address.txt")) as f:
    marketplace_address = f.read().strip()

with open(os.path.join(os.path.dirname(__file__), "../../shared/abis/property_nft_abi.json")) as f:
    nft_abi = json.load(f)
with open(os.path.join(os.path.dirname(__file__), "../../shared/abis/marketplace_abi.json")) as f:
    marketplace_abi = json.load(f)

nft_contract = w3.eth.contract(address=nft_address, abi=nft_abi)
marketplace_contract = w3.eth.contract(address=marketplace_address, abi=marketplace_abi)

# Get Private Key from ENV
DEPLOYER_PK = os.getenv("PRIVATE_KEY")
if not DEPLOYER_PK:
    print("ERROR: PRIVATE_KEY not found in .env. Cannot proceed with minting.")
    sys.exit(1)

deployer_acc = w3.eth.account.from_key(DEPLOYER_PK)

async def main():
    print(f"Connected to Web3: {w3.is_connected()}")
    print(f"Admin Wallet: {deployer_acc.address}")

    engine = create_async_engine(settings.DATABASE_URL, connect_args={'prepared_statement_cache_size': 0})

    async with engine.begin() as conn:
        # Fetch properties that aren't NFTs yet and have a valid price
        # Using a limit of 5 for the demo, so we don't spam 100 txs
        result = await conn.execute(text("SELECT id, title, price FROM properties WHERE is_nft = 0.0 OR is_nft IS NULL LIMIT 1"))
        properties = result.mappings().fetchall()

        if not properties:
            print("No new properties to mint.")
            return

        for idx, prop in enumerate(properties):
            prop_id = str(prop["id"])
            title = prop["title"]
            # Convert INR to MATIC
            matic_price = prop["price"] / 80
            price_wei = int(matic_price * 1e18)

            print(f"\nMinting [{title}] (ID: {prop_id})")

            # 1. Mint NFT
            nonce = w3.eth.get_transaction_count(deployer_acc.address)
            mint_tx = nft_contract.functions.mintProperty(
                deployer_acc.address,
                title[:20], # Short preview hash
                prop_id
            ).build_transaction({
                'from': deployer_acc.address,
                'nonce': nonce,
                'gas': 500000,
                'gasPrice': w3.eth.gas_price
            })

            signed_mint = w3.eth.account.sign_transaction(mint_tx, private_key=DEPLOYER_PK)
            tx_hash = w3.eth.send_raw_transaction(signed_mint.raw_transaction)
            w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Get Token ID (Assuming token ID increments sequentially from totalSupply)
            # Actually, standard ERC721 doesn't track totalSupply out of the box in OZ unless enumerated.
            # But the contract returns the item ID. Let's just track it via the script counter here,
            # Or fetch the latest event. Since we seeded 20 before, the next is 20.
            # To be safe, let's call tokenCounter() on PropertyNFT (if it exists)
            try:
                token_id = nft_contract.functions.tokenCounter().call() - 1
            except:
                # Fallback to total seeded + idx
                token_id = 20 + idx
                
            print(f"--> Minted! Token ID: {token_id}")

            # 2. Approve Marketplace to handle this Token ID
            nonce = w3.eth.get_transaction_count(deployer_acc.address)
            approve_tx = nft_contract.functions.approve(marketplace_address, token_id).build_transaction({
                'from': deployer_acc.address,
                'nonce': nonce,
                'gas': 100000,
                'gasPrice': w3.eth.gas_price
            })
            signed_approve = w3.eth.account.sign_transaction(approve_tx, private_key=DEPLOYER_PK)
            tx_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
            w3.eth.wait_for_transaction_receipt(tx_hash)

            # 3. List Property on Marketplace
            nonce = w3.eth.get_transaction_count(deployer_acc.address)
            list_tx = marketplace_contract.functions.listProperty(nft_address, token_id, price_wei).build_transaction({
                'from': deployer_acc.address,
                'nonce': nonce,
                'gas': 300000,
                'gasPrice': w3.eth.gas_price
            })
            signed_list = w3.eth.account.sign_transaction(list_tx, private_key=DEPLOYER_PK)
            tx_hash = w3.eth.send_raw_transaction(signed_list.raw_transaction)
            w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"--> Listed on Marketplace for {matic_price:.2f} MATIC")

            # 4. Update Database
            await conn.execute(
                text("UPDATE properties SET is_nft = 1.0, nft_token_id = :tid, blockchain_hash = :bhash, status = 'available' WHERE id = :pid"),
                {"tid": token_id, "bhash": w3.to_hex(tx_hash), "pid": prop_id}
            )
            print(f"--> Database mapped to Token ID {token_id}")

    await engine.dispose()
    print("\nMinting Process Complete!")

if __name__ == "__main__":
    asyncio.run(main())
