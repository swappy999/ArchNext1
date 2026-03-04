from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.verification.middlewares.auth_checks import get_current_user
from app.services.nft_service import mint_property_nft_service, get_nft_status_service

router = APIRouter(prefix="/nft", tags=["NFT Ownership"])

class MintRequest(BaseModel):
    wallet_address: str

@router.post("/mint/{property_id}")
async def mint_nft(
    property_id: str,
    body: MintRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Mints a PropertyNFT for the given property.
    - Only the property owner can mint
    - Wallet address is where the NFT will be sent
    - Stores token_id + tx_hash in MongoDB
    """
    return await mint_property_nft_service(property_id, body.wallet_address, current_user)

@router.get("/status/{property_id}")
async def nft_status(property_id: str):
    """
    Returns the NFT ownership status for a property.
    Public — anyone can verify who owns a property on-chain.
    """
    return await get_nft_status_service(property_id)
