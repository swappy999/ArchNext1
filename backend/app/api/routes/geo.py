from fastapi import APIRouter, Depends, HTTPException
from app.core.verification.errors.exceptions import AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError
from fastapi import Query
from app.services.geo_service import geo_intelligence
from app.core.verification.middlewares.auth_checks import get_current_user

router = APIRouter()

@router.get("/analysis")
async def geo_analysis(
    longitude: float, 
    latitude: float, 
    radius: int = Query(3000, description="Analysis radius in meters"),
    current_user = Depends(get_current_user)
):
    """
    Returns AI-powered spatial analysis of an area.
    """
    return await geo_intelligence(longitude, latitude, radius)
