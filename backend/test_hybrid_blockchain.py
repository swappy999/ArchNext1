"""
test_hybrid_blockchain.py
---------------------------------------------------------------------------
Tests for the hybrid blockchain execution router (blockchain/blockchain_service.py).

All tests are offline -- no live RPC, no DB connection required.

Run:
    cd "c:/MY PROJECTS/ArchNext/backend"
    python test_hybrid_blockchain.py
"""

import asyncio


# --- Test 1: Chain resolution logic ------------------------------------------
def test_resolve_chain():
    print("[START] Testing _resolve_chain()...")
    from blockchain.blockchain_service import _resolve_chain, DEFAULT_CHAIN

    assert _resolve_chain(None) == DEFAULT_CHAIN, "None should default to polygon"
    assert _resolve_chain("") == DEFAULT_CHAIN, "Empty string should default to polygon"
    assert _resolve_chain("polygon") == "polygon", "Explicit polygon should stay polygon"
    assert _resolve_chain("POLYGON") == "polygon", "Case insensitive"
    assert _resolve_chain("ethereum") == DEFAULT_CHAIN, "Unsupported chain should fall back"
    assert _resolve_chain("solana") == DEFAULT_CHAIN, "Unsupported chain should fall back"

    print("[PASS] _resolve_chain() correctly defaults unsupported/None -> '%s'" % DEFAULT_CHAIN)


# --- Test 2: execute_sell -- polygon offline path ----------------------------
async def test_execute_sell_offline():
    print("[START] Testing execute_sell() offline fallback (no contract configured)...")
    from blockchain.blockchain_service import execute_sell

    result = await execute_sell(None, {
        "nft_contract_address": "0xFakeContract",
        "token_id": 0,
        "price_wei": int(2.5 * 1e18),
    })

    print("[INFO] execute_sell result: %s" % result)
    assert "chain" in result, "result must include 'chain' key"
    assert result["chain"] == "polygon", "Should resolve to polygon"
    assert result.get("mode") in ("offline", "error", "live"), "Should return a mode"
    print("[PASS] execute_sell() does not crash when blockchain not configured.")


# --- Test 3: execute_buy -- polygon offline path ------------------------------
async def test_execute_buy_offline():
    print("[START] Testing execute_buy() offline fallback...")
    from blockchain.blockchain_service import execute_buy

    result = await execute_buy("polygon", {
        "nft_contract_address": "0xFakeNFT",
        "token_id": 3,
    })

    print("[INFO] execute_buy result: %s" % result)
    assert "chain" in result
    assert result["chain"] == "polygon"
    print("[PASS] execute_buy() offline path works.")


# --- Test 4: execute_bid -- records intent offline ---------------------------
async def test_execute_bid_records():
    print("[START] Testing execute_bid() intent recording...")
    from blockchain.blockchain_service import execute_bid

    result = await execute_bid("polygon", {
        "auction_id": "auction_abc",
        "amount": 50000.0,
        "tx_hash": "0xTESTHASH",
    })

    print("[INFO] execute_bid result: %s" % result)
    assert "chain" in result
    assert result["chain"] == "polygon"
    assert result["success"] is True
    assert result["auction_id"] == "auction_abc"
    assert result["amount"] == 50000.0
    print("[PASS] execute_bid() records intent correctly.")


# --- Test 5: mint_property_nft -- offline mode no crash ----------------------
async def test_mint_property_nft_offline():
    print("[START] Testing mint_property_nft() offline mode...")
    from blockchain.blockchain_service import mint_property_nft

    result = await mint_property_nft(None, {
        "wallet": "0xOwner123",
        "hash": "a" * 64,
        "property_id": "prop_test_001",
    })

    print("[INFO] mint result: %s" % result)
    assert "chain" in result
    assert result["chain"] == "polygon"  # None -> polygon fallback
    assert result.get("mode") in ("offline", "error", "live")
    print("[PASS] mint_property_nft() handles offline mode gracefully.")


# --- Test 6: Unknown chain -> polygon fallback --------------------------------
async def test_unknown_chain_fallback():
    print("[START] Testing unknown chain falls back to polygon...")
    from blockchain.blockchain_service import execute_sell

    result = await execute_sell("ethereum_mainnet", {
        "nft_contract_address": "0xFake",
        "token_id": 1,
        "price_wei": 1000,
    })

    assert result["chain"] == "polygon", "Unknown chain must fall back to polygon"
    print("[PASS] Unknown chain -> polygon fallback confirmed.")


# --- Test 7: Chain injected in every result ----------------------------------
async def test_chain_always_in_result():
    print("[START] Testing that all functions inject 'chain' key in result...")
    from blockchain.blockchain_service import execute_buy, execute_sell, execute_bid, mint_property_nft

    payload = {"nft_contract_address": "0xF", "token_id": 0, "price_wei": 0}
    bid_payload = {"auction_id": "x", "amount": 0, "tx_hash": "0x0"}
    mint_payload = {"wallet": "0xW", "hash": "b" * 64, "property_id": "pid"}

    for fn, args in [
        (execute_buy, ("polygon", payload)),
        (execute_sell, ("polygon", payload)),
        (execute_bid, ("polygon", bid_payload)),
        (mint_property_nft, ("polygon", mint_payload)),
    ]:
        result = await fn(*args)
        assert "chain" in result, "%s must inject 'chain' into result" % fn.__name__

    print("[PASS] All router functions inject 'chain' key.")


async def main():
    test_resolve_chain()
    await test_execute_sell_offline()
    await test_execute_buy_offline()
    await test_execute_bid_records()
    await test_mint_property_nft_offline()
    await test_unknown_chain_fallback()
    await test_chain_always_in_result()
    print("")
    print("[END] All Hybrid Blockchain Router Tests Passed!")


if __name__ == "__main__":
    asyncio.run(main())
