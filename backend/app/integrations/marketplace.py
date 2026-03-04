import json
import os
from app.core.config import settings

# ─── Graceful web3 import ────────────────────────────────────────────────────
try:
    from web3 import Web3
    _web3_available = True
except ImportError:
    _web3_available = False

_w3 = None
_marketplace_contract = None

def _get_web3():
    global _w3
    if not _web3_available:
        return None
    if _w3 is None and settings.POLYGON_RPC:
        _w3 = Web3(Web3.HTTPProvider(settings.POLYGON_RPC))
    return _w3

def _get_marketplace_contract():
    global _marketplace_contract
    if _marketplace_contract is not None:
        return _marketplace_contract

    w3 = _get_web3()
    if not w3:
        return None

    marketplace_address = getattr(settings, "MARKETPLACE_ADDRESS", None)
    if not marketplace_address:
        return None

    abi_path = os.path.join(os.path.dirname(__file__), "../../../shared/abis/marketplace_abi.json")
    if not os.path.exists(abi_path):
        print("Warning: marketplace_abi.json not found. Deploy PropertyMarketplace.sol first.")
        return None

    with open(abi_path) as f:
        abi = json.load(f)

    _marketplace_contract = w3.eth.contract(
        address=Web3.to_checksum_address(marketplace_address),
        abi=abi
    )
    return _marketplace_contract

# ─── Read Functions (Backend can call these) ─────────────────────────────────

def get_listing(nft_contract_address: str, token_id: int) -> dict:
    """
    Reads the on-chain listing for a given NFT token.
    Returns seller, price (in wei), and active status.
    """
    contract = _get_marketplace_contract()
    if not contract:
        return {"mode": "offline", "active": False}

    try:
        seller, price, active = contract.functions.getListing(
            Web3.to_checksum_address(nft_contract_address),
            token_id
        ).call()
        return {
            "mode": "live",
            "token_id": token_id,
            "seller": seller,
            "price_wei": price,
            "price_matic": round(price / 1e18, 6) if price else 0,
            "active": active
        }
    except Exception as e:
        return {"mode": "error", "active": False, "message": str(e)}

def list_property_backend(nft_contract_address: str, token_id: int, price_wei: int) -> dict:
    """
    Backend-initiated listing (for testing/admin).
    In production, this should be called by the frontend via MetaMask.
    """
    contract = _get_marketplace_contract()
    w3 = _get_web3()

    if not contract or not w3:
        return {"success": False, "mode": "offline", "message": "Marketplace not configured."}

    wallet = getattr(settings, "WALLET_ADDRESS", None)
    private_key = getattr(settings, "PRIVATE_KEY", None)
    if not wallet or not private_key:
        return {"success": False, "mode": "offline", "message": "Wallet not configured."}

    try:
        tx = contract.functions.listProperty(
            Web3.to_checksum_address(nft_contract_address),
            token_id,
            price_wei
        ).build_transaction({
            "from": Web3.to_checksum_address(wallet),
            "nonce": w3.eth.get_transaction_count(Web3.to_checksum_address(wallet)),
            "gas": 200000,
            "gasPrice": w3.eth.gas_price
        })
        signed = w3.eth.account.sign_transaction(tx, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        return {"success": True, "tx_hash": tx_hash.hex(), "mode": "live"}
    except Exception as e:
        return {"success": False, "mode": "error", "message": str(e)}
