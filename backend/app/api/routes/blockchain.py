from fastapi import APIRouter, Depends
from app.core.verification.middlewares.auth_checks import get_current_user
from app.services.blockchain_service import (
    verify_property_service,
    get_verification_status_service
)

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])

@router.post("/verify/{property_id}")
async def verify_property(
    property_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Verifies a property on the Polygon blockchain.
    - Generates SHA-256 hash of property data
    - Sends hash to smart contract
    - Stores tx_hash in MongoDB
    
    Only the property owner can verify their property.
    """
    return await verify_property_service(property_id, current_user)

@router.get("/status/{property_id}")
async def verification_status(property_id: str):
    """
    Returns the on-chain verification status for a property.
    Public endpoint — anyone can check if a property is verified.
    """
    return await get_verification_status_service(property_id)

# ─── Mock Algorand Endpoints ────────────────────────────────────────────────

import uuid
from pydantic import BaseModel

class AlgoMintRequest(BaseModel):
    token_uri: str

class AlgoBuyListRequest(BaseModel):
    token_id: int
    price_wei: str

class AlgoAuctionCreateRequest(BaseModel):
    token_id: int
    reserve_price_wei: str
    duration: int

class AlgoApproveRequest(BaseModel):
    amount_wei: str

class AlgoBidRequest(BaseModel):
    on_chain_id: int
    amount_wei: str

class AlgoFinalizeRequest(BaseModel):
    on_chain_id: int

def _mock_tx():
    return {"tx_hash": f"algo_tx_{uuid.uuid4().hex[:16]}"}

@router.post("/algorand/mint")
async def algo_mint(body: AlgoMintRequest, current_user: dict = Depends(get_current_user)):
    return _mock_tx()

@router.post("/algorand/buy")
async def algo_buy(body: AlgoBuyListRequest, current_user: dict = Depends(get_current_user)):
    return _mock_tx()

@router.post("/algorand/list")
async def algo_list(body: AlgoBuyListRequest, current_user: dict = Depends(get_current_user)):
    return _mock_tx()

@router.post("/algorand/auction/create")
async def algo_auction_create(body: AlgoAuctionCreateRequest, current_user: dict = Depends(get_current_user)):
    return _mock_tx()

@router.post("/algorand/approve")
async def algo_approve(body: AlgoApproveRequest, current_user: dict = Depends(get_current_user)):
    return _mock_tx()

@router.post("/algorand/auction/bid")
async def algo_bid(body: AlgoBidRequest, current_user: dict = Depends(get_current_user)):
    return _mock_tx()

@router.post("/algorand/auction/finalize")
async def algo_finalize(body: AlgoFinalizeRequest, current_user: dict = Depends(get_current_user)):
    return _mock_tx()
