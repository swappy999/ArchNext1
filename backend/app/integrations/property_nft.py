import json
import os
from app.core.config import settings
from app.integrations.blockchain import generate_property_hash

# ─── Graceful web3 import ────────────────────────────────────────────────────
try:
    from web3 import Web3
    _web3_available = True
except ImportError:
    _web3_available = False

# ─── Lazy Contract Setup ─────────────────────────────────────────────────────
_w3 = None
_nft_contract = None

def _get_web3():
    global _w3
    if not _web3_available:
        return None
    if _w3 is None and settings.POLYGON_RPC:
        _w3 = Web3(Web3.HTTPProvider(settings.POLYGON_RPC))
    return _w3

def _get_nft_contract():
    global _nft_contract
    if _nft_contract is not None:
        return _nft_contract

    w3 = _get_web3()
    if not w3:
        return None

    nft_address = getattr(settings, "NFT_CONTRACT_ADDRESS", None)
    if not nft_address:
        return None

    abi_path = os.path.join(os.path.dirname(__file__), "../../../shared/abis/property_nft_abi.json")
    if not os.path.exists(abi_path):
        print("Warning: property_nft_abi.json not found. Deploy PropertyNFT.sol first.")
        return None

    with open(abi_path) as f:
        abi = json.load(f)

    _nft_contract = w3.eth.contract(
        address=Web3.to_checksum_address(nft_address),
        abi=abi
    )
    return _nft_contract

# ─── Core NFT Functions ───────────────────────────────────────────────────────

def mint_property_nft(wallet_address: str, property_hash: str, property_id: str) -> dict:
    """
    Mints a new PropertyNFT token on Polygon.
    
    Args:
        wallet_address: Owner's wallet (MetaMask address)
        property_hash: SHA-256 hash of property data
        property_id: MongoDB document ID (off-chain reference)
    
    Returns:
        dict with tx_hash, token_id (if available), and mode
    """
    contract = _get_nft_contract()
    w3 = _get_web3()

    if not contract or not w3:
        return {
            "success": False,
            "tx_hash": None,
            "token_id": None,
            "mode": "offline",
            "message": "NFT contract not configured. Set POLYGON_RPC and NFT_CONTRACT_ADDRESS."
        }

    wallet = getattr(settings, "WALLET_ADDRESS", None)
    private_key = getattr(settings, "PRIVATE_KEY", None)

    if not wallet or not private_key:
        return {
            "success": False,
            "tx_hash": None,
            "token_id": None,
            "mode": "offline",
            "message": "Wallet credentials not configured."
        }

    try:
        # Get current token counter (will be the new tokenId)
        token_id = contract.functions.tokenCounter().call()

        tx = contract.functions.mintProperty(
            Web3.to_checksum_address(wallet_address),
            property_hash,
            property_id
        ).build_transaction({
            "from": Web3.to_checksum_address(wallet),
            "nonce": w3.eth.get_transaction_count(Web3.to_checksum_address(wallet)),
            "gas": 300000,
            "gasPrice": w3.eth.gas_price
        })

        signed = w3.eth.account.sign_transaction(tx, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "token_id": token_id,
            "mode": "live",
            "property_hash": property_hash
        }

    except Exception as e:
        return {
            "success": False,
            "tx_hash": None,
            "token_id": None,
            "mode": "error",
            "message": str(e)
        }

def get_nft_owner(token_id: int) -> dict:
    """
    Returns the current on-chain owner of a property NFT.
    """
    contract = _get_nft_contract()
    if not contract:
        return {"mode": "offline", "owner": None}

    try:
        owner, property_hash, property_id = contract.functions.getPropertyToken(token_id).call()
        return {
            "mode": "live",
            "token_id": token_id,
            "owner": owner,
            "property_hash": property_hash,
            "property_id": property_id
        }
    except Exception as e:
        return {"mode": "error", "owner": None, "message": str(e)}

def check_nft_minted(property_hash: str) -> bool:
    """
    Returns True if a property hash has already been minted as an NFT.
    """
    contract = _get_nft_contract()
    if not contract:
        return False
    try:
        return contract.functions.isMinted(property_hash).call()
    except Exception:
        return False
