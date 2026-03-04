import json
import os
from app.core.config import settings
from app.repository.property_repo import update_property

# ─── Graceful web3 import ────────────────────────────────────────────────────
try:
    from web3 import Web3
    _web3_available = True
except ImportError:
    _web3_available = False

_LAST_BLOCK_FILE = os.path.join(os.path.dirname(__file__), "../../indexer_last_block.json")

def _load_last_block():
    if os.path.exists(_LAST_BLOCK_FILE):
        try:
            with open(_LAST_BLOCK_FILE) as f:
                data = json.load(f)
                return data.get("last_block", 0)
        except Exception:
            pass
    return 0

def _save_last_block(block_num: int):
    try:
        with open(_LAST_BLOCK_FILE, "w") as f:
            json.dump({"last_block": block_num}, f)
    except Exception:
        pass

def _get_web3():
    if not _web3_available or not settings.POLYGON_RPC:
        return None
    return Web3(Web3.HTTPProvider(settings.POLYGON_RPC))

def _load_abi(filename: str):
    path = os.path.join(os.path.dirname(__file__), f"../../{filename}")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)

async def poll_nft_transfers():
    """
    Reads Transfer events from PropertyNFT contract.
    Updates MongoDB owner_wallet when on-chain ownership changes.
    """
    w3 = _get_web3()
    if not w3:
        return {"mode": "offline", "events": 0}

    nft_address = getattr(settings, "NFT_CONTRACT_ADDRESS", None)
    abi = _load_abi("../shared/abis/property_nft_abi.json")
    if not nft_address or not abi:
        return {"mode": "offline", "events": 0}

    try:
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(nft_address),
            abi=abi
        )
        from_block = _load_last_block()
        current_block = w3.eth.block_number
        if from_block == 0:
            from_block = max(0, current_block - 1000)

        # Fetch Transfer events
        events = contract.events.Transfer.get_logs(
            from_block=from_block,
            to_block=current_block
        )

        processed = 0
        for event in events:
            token_id = event["args"]["tokenId"]
            new_owner = event["args"]["to"]

            # Find property with this token_id and update owner_wallet
            # We can't query by token_id directly without a custom repo method,
            # so we update the matching property in DB
            from app.core.database import AsyncSessionLocal
            from app.models.property_model import PropertyDB
            from sqlalchemy import update
            
            async with AsyncSessionLocal() as session:
                stmt = update(PropertyDB).where(PropertyDB.blockchain_hash == str(token_id)).values(
                    owner_id=new_owner
                )
                await session.execute(stmt)
                await session.commit()
            processed += 1

        _save_last_block(current_block)
        return {"mode": "live", "events": processed, "last_block": current_block}

    except Exception as e:
        return {"mode": "error", "events": 0, "message": str(e)}

async def poll_marketplace_sales():
    """
    Reads PropertySold events from PropertyMarketplace contract.
    Clears listing_status in MongoDB when a sale occurs on-chain.
    """
    w3 = _get_web3()
    if not w3:
        return {"mode": "offline", "events": 0}

    marketplace_address = getattr(settings, "MARKETPLACE_ADDRESS", None)
    abi = _load_abi("../shared/abis/marketplace_abi.json")
    if not marketplace_address or not abi:
        return {"mode": "offline", "events": 0}

    try:
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(marketplace_address),
            abi=abi
        )
        from_block = _load_last_block()
        current_block = w3.eth.block_number
        if from_block == 0:
            from_block = max(0, current_block - 1000)

        events = contract.events.PropertySold.get_logs(
            from_block=from_block,
            to_block=current_block
        )

        processed = 0
        for event in events:
            token_id = event["args"]["tokenId"]
            buyer = event["args"]["buyer"]
            price = event["args"]["price"]

            from app.core.database import AsyncSessionLocal
            from app.models.property_model import PropertyDB
            from sqlalchemy import update
            
            async with AsyncSessionLocal() as session:
                stmt = update(PropertyDB).where(PropertyDB.blockchain_hash == str(token_id)).values(
                    owner_id=buyer,
                    status="sold"
                )
                await session.execute(stmt)
                await session.commit()
            processed += 1

        return {"mode": "live", "events": processed}

    except Exception as e:
        return {"mode": "error", "events": 0, "message": str(e)}

async def run_indexer():
    """
    Runs both pollers. Called by the background event listener.
    """
    nft_result = await poll_nft_transfers()
    market_result = await poll_marketplace_sales()
    return {"nft_transfers": nft_result, "marketplace_sales": market_result}
