from app.integrations.property_nft import get_nft_owner, check_nft_minted
from app.integrations.blockchain import generate_property_hash
from app.repository.property_repo import get_property_by_id, update_property
from blockchain.blockchain_service import mint_property_nft as chain_mint
from fastapi import HTTPException
from app.core.verification.errors.exceptions import AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError

async def mint_property_nft_service(property_id: str, wallet_address: str, current_user: dict) -> dict:
    """
    Mints a PropertyNFT for a verified property.
    
    Flow:
    1. Fetch property from DB
    2. Ownership check
    3. Generate SHA-256 hash
    4. Mint NFT on Polygon (or offline mode)
    5. Store token_id + tx_hash + wallet in MongoDB
    """
    # 1. Fetch property
    property_data = await get_property_by_id(property_id)
    if not property_data:
        raise NotFoundError(detail="Property not found")

    # 2. Ownership check
    if str(property_data.get("owner_id")) != str(current_user["_id"]):
        raise AuthorizationError(detail="Only the owner can mint this property as NFT")

    # 3. Check if already minted
    existing_hash = property_data.get("property_hash") or property_data.get("nft_metadata_hash")
    if property_data.get("is_nft") or property_data.get("nft_token_id") is not None or property_data.get("mint_tx_hash"):
        raise HTTPException(status_code=409, detail="This property has already been minted as an NFT")
    if existing_hash and check_nft_minted(existing_hash):
        raise HTTPException(status_code=409, detail="This property has already been minted on-chain")

    # 4. Generate hash (or reuse existing)
    property_hash = existing_hash or generate_property_hash(property_data)

    # 5. Resolve chain and mint via hybrid router (defaults to polygon)
    chain = property_data.get("chain") or "polygon"
    mint_result = await chain_mint(
        chain,
        {
            "wallet": wallet_address,
            "hash": property_hash,
            "property_id": property_id,
        },
    )

    # 6. Update DB with NFT data + chain used
    update_data = {
        "property_hash": property_hash,
        "owner_wallet": wallet_address,
        "nft_minted": mint_result["success"],
        "nft_mode": mint_result["mode"],
        "chain": mint_result.get("chain", chain),  # persist resolved chain
    }
    if mint_result.get("tx_hash"):
        update_data["nft_tx"] = mint_result["tx_hash"]
    if mint_result.get("token_id") is not None:
        update_data["nft_token_id"] = mint_result["token_id"]

    await update_property(property_id, update_data)

    return {
        "property_id": property_id,
        "property_hash": property_hash,
        "wallet_address": wallet_address,
        "chain": mint_result.get("chain", chain),
        "nft_result": mint_result
    }

async def get_nft_status_service(property_id: str) -> dict:
    """
    Returns the NFT ownership status for a property.
    Public endpoint — anyone can verify ownership.
    """
    property_data = await get_property_by_id(property_id)
    if not property_data:
        raise NotFoundError(detail="Property not found")

    token_id = property_data.get("nft_token_id")
    nft_tx = property_data.get("nft_tx")
    owner_wallet = property_data.get("owner_wallet")

    on_chain = {}
    if token_id is not None:
        on_chain = get_nft_owner(token_id)

    return {
        "property_id": property_id,
        "nft_minted": property_data.get("nft_minted", False),
        "nft_token_id": token_id,
        "nft_tx": nft_tx,
        "owner_wallet": owner_wallet,
        "on_chain": on_chain
    }
