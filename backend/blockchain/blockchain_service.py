"""
blockchain/blockchain_service.py
─────────────────────────────────────────────────────────────────────────────
Hybrid chain-execution router for ArchNext.

This is the SINGLE entry-point for all blockchain write operations across the
platform. Services call execute_buy / execute_sell / execute_bid / mint_property_nft
and this module resolves the target chain, then delegates to the appropriate
integration. Currently supports "polygon"; extensible to additional chains by
adding a handler in the _CHAIN_HANDLERS registry.

RULES:
  • If chain is None or unrecognised → default to "polygon".
  • Every function returns the dispatcher result PLUS a "chain" key so callers
    always know which chain was actually used.
  • No DB connections are opened here — callers manage their own sessions.
  • All functions are async for compatibility with FastAPI endpoints.
"""

from __future__ import annotations
import logging

logger = logging.getLogger(__name__)

# ── Supported chains ──────────────────────────────────────────────────────────
SUPPORTED_CHAINS: set[str] = {"polygon", "algorand"}
DEFAULT_CHAIN = "polygon"


def _resolve_chain(chain: str | None) -> str:
    """
    Resolves a chain identifier to a canonical lower-case name.
    Falls back to DEFAULT_CHAIN if None or unsupported.
    """
    if not chain:
        return DEFAULT_CHAIN
    resolved = chain.strip().lower()
    if resolved not in SUPPORTED_CHAINS:
        logger.warning(
            "Unsupported chain '%s' requested – defaulting to '%s'.",
            chain,
            DEFAULT_CHAIN,
        )
        return DEFAULT_CHAIN
    return resolved


# ─── Polygon handlers (lazy imports keep startup fast) ───────────────────────

def _polygon_buy(payload: dict) -> dict:
    """
    Executes a buy transaction on Polygon.
    Currently mirrors list_property_backend read logic; the actual on-chain buy
    is performed client-side via MetaMask. Backend records the intent.
    """
    try:
        from app.integrations.marketplace import get_listing
        nft_address = payload.get("nft_contract_address", "")
        token_id = payload.get("token_id", 0)
        result = get_listing(nft_address, int(token_id) if token_id else 0)
        return {"success": True, "mode": result.get("mode", "offline"), "data": result}
    except Exception as exc:
        logger.exception("polygon buy error: %s", exc)
        return {"success": False, "mode": "error", "message": str(exc)}


def _polygon_sell(payload: dict) -> dict:
    """
    Executes a sell/list transaction on Polygon.
    Delegates to list_property_backend for backend-initiated listings.
    """
    try:
        from app.integrations.marketplace import list_property_backend
        nft_address = payload.get("nft_contract_address", "")
        token_id = int(payload.get("token_id", 0))
        price_wei = int(payload.get("price_wei", 0))
        result = list_property_backend(nft_address, token_id, price_wei)
        return result
    except Exception as exc:
        logger.exception("polygon sell error: %s", exc)
        return {"success": False, "mode": "error", "message": str(exc)}


def _polygon_bid(payload: dict) -> dict:
    """
    Records a bid against an on-chain auction listing.
    The actual on-chain bid comes from the client wallet; backend records intent.
    """
    try:
        auction_id = payload.get("auction_id", "")
        amount = payload.get("amount", 0)
        tx_hash = payload.get("tx_hash", "")
        return {
            "success": True,
            "mode": "recorded",
            "auction_id": auction_id,
            "amount": amount,
            "tx_hash": tx_hash,
            "message": "Bid intent recorded. Complete on-chain via MetaMask.",
        }
    except Exception as exc:
        logger.exception("polygon bid error: %s", exc)
        return {"success": False, "mode": "error", "message": str(exc)}


def _polygon_mint(metadata: dict) -> dict:
    """
    Mints a PropertyNFT on Polygon.
    Delegates to the existing integrations/property_nft module.
    """
    try:
        from app.integrations.property_nft import mint_property_nft as _mint
        wallet = metadata.get("wallet", "")
        prop_hash = metadata.get("hash", "")
        property_id = metadata.get("property_id", "")
        result = _mint(wallet, prop_hash, property_id)
        return result
    except Exception as exc:
        logger.exception("polygon mint error: %s", exc)
        return {
            "success": False,
            "tx_hash": None,
            "token_id": None,
            "mode": "error",
            "message": str(exc),
        }


# ─── Algorand handlers (Stubs for Hybrid Phase) ──────────────────────────────
def _algorand_buy(payload: dict) -> dict:
    logger.info("Algorand stub: buy")
    return {"success": True, "mode": "algorand_testnet_stub", "message": "Algorand Buy executed (stub)."}

def _algorand_sell(payload: dict) -> dict:
    logger.info("Algorand stub: sell")
    return {"success": True, "mode": "algorand_testnet_stub", "message": "Algorand Sell executed (stub)."}

def _algorand_bid(payload: dict) -> dict:
    logger.info("Algorand stub: bid")
    return {"success": True, "mode": "algorand_testnet_stub", "message": "Algorand Bid executed (stub)."}

def _algorand_mint(metadata: dict) -> dict:
    logger.info("Algorand stub: mint")
    return {
        "success": True, 
        "mode": "algorand_testnet_stub", 
        "tx_hash": "algo_tx_stub_12345", 
        "token_id": 999999,
        "message": "Algorand Mint executed (stub)."
    }


# ─── Chain dispatch tables ────────────────────────────────────────────────────
# Each entry maps a chain name → handler callable(payload) → dict.
# Add new chains here without touching any service layer code.

_BUY_HANDLERS: dict[str, callable] = {
    "polygon": _polygon_buy,
    "algorand": _algorand_buy,
}

_SELL_HANDLERS: dict[str, callable] = {
    "polygon": _polygon_sell,
    "algorand": _algorand_sell,
}

_BID_HANDLERS: dict[str, callable] = {
    "polygon": _polygon_bid,
    "algorand": _algorand_bid,
}

_MINT_HANDLERS: dict[str, callable] = {
    "polygon": _polygon_mint,
    "algorand": _algorand_mint,
}


# ─── Public API ──────────────────────────────────────────────────────────────

async def execute_buy(chain: str | None, payload: dict) -> dict:
    """
    Route a buy execution to the correct chain.

    Args:
        chain:   Target chain ("polygon", or None → defaults to polygon).
        payload: Chain-specific parameters (nft_contract_address, token_id, …).

    Returns:
        Result dict with at least {"chain": str, "success": bool, "mode": str}.
    """
    resolved = _resolve_chain(chain)
    logger.info("execute_buy → chain=%s", resolved)
    handler = _BUY_HANDLERS.get(resolved, _polygon_buy)
    result = handler(payload)
    result["chain"] = resolved
    return result


async def execute_sell(chain: str | None, payload: dict) -> dict:
    """
    Route a sell/list execution to the correct chain.

    Args:
        chain:   Target chain ("polygon", or None → defaults to polygon).
        payload: Chain-specific parameters (nft_contract_address, token_id, price_wei).

    Returns:
        Result dict with at least {"chain": str, "success": bool, "mode": str}.
    """
    resolved = _resolve_chain(chain)
    logger.info("execute_sell → chain=%s", resolved)
    handler = _SELL_HANDLERS.get(resolved, _polygon_sell)
    result = handler(payload)
    result["chain"] = resolved
    return result


async def execute_bid(chain: str | None, payload: dict) -> dict:
    """
    Route a bid execution to the correct chain.

    Args:
        chain:   Target chain ("polygon", or None → defaults to polygon).
        payload: Bid parameters (auction_id, amount, tx_hash).

    Returns:
        Result dict with at least {"chain": str, "success": bool, "mode": str}.
    """
    resolved = _resolve_chain(chain)
    logger.info("execute_bid → chain=%s", resolved)
    handler = _BID_HANDLERS.get(resolved, _polygon_bid)
    result = handler(payload)
    result["chain"] = resolved
    return result


async def mint_property_nft(chain: str | None, metadata: dict) -> dict:
    """
    Route an NFT mint to the correct chain.

    Args:
        chain:    Target chain ("polygon", or None → defaults to polygon).
        metadata: NFT creation data (wallet, hash, property_id).

    Returns:
        Result dict with at least {"chain": str, "success": bool, "mode": str}.
    """
    resolved = _resolve_chain(chain)
    logger.info("mint_property_nft → chain=%s", resolved)
    handler = _MINT_HANDLERS.get(resolved, _polygon_mint)
    result = handler(metadata)
    result["chain"] = resolved
    return result
