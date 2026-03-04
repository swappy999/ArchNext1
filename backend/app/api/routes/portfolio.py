from fastapi import APIRouter, Depends
from app.core.verification.middlewares.auth_checks import get_current_user
from app.services.portfolio_service import get_portfolio

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])

@router.get("/me")
async def my_portfolio(current_user: dict = Depends(get_current_user)):
    """
    Returns the authenticated user's complete Web3 portfolio.
    
    For each owned property:
    - NFT ownership proof (on-chain)
    - Active marketplace listing status + price
    - AI-predicted future value + growth %
    
    Aggregates:
    - Total portfolio value
    - Total predicted value
    - Portfolio growth %
    """
    return await get_portfolio(current_user)
