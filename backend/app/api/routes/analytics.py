from fastapi import APIRouter, Depends, Query
from app.services.analytics_service import get_market_analytics, get_global_property_index, get_investment_discovery
from app.core.verification.middlewares.auth_checks import get_current_user
from typing import Optional

from app.services.urban_growth_engine import urban_engine

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/growth-zones")
async def get_growth_zones():
    """
    Returns AI-generated prosperity analysis for major geographical zones.
    Includes classification (HOT_GROWTH, STAGNANT, etc.), vector breakdowns,
    and a generated heatmap scatter array for UI rendering.
    """
    # The engine generates deterministic but lightly variance-shifted data 
    # based on the current week to simulate live flux.
    data = urban_engine.get_global_heatmaps()
    return data

@router.get("/market")
async def fetch_market_analytics():
    """
    Returns aggregated region data, hot spots, and auction metrics for the Investment Heatmap.
    Public endpoint.
    """
    return await get_market_analytics()

@router.get("/index")
async def fetch_global_property_index():
    """
    Returns the national ArchNext Property Index and city-level trends.
    Public endpoint.
    """
    return await get_global_property_index()

@router.get("/discovery")
async def fetch_investment_discovery(
    budget: Optional[float] = Query(None, description="Maximum budget for investment"),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns AI-recommended properties based on advanced scoring and optional budget.
    Requires authentication.
    """
    user_id = str(current_user.get("_id", current_user.get("id")))
    recommendations = await get_investment_discovery(user_id=user_id, budget=budget)
    return {"recommendations": recommendations}

import random

@router.get("/trending")
async def get_trending_zones(top_n: int = 5):
    """
    Returns top trending geographical zones formatted for the dashboard store.
    """
    data = urban_engine.get_global_heatmaps()
    trending = []
    for z in data["zones"]:
        trending.append({
            "grid_key": z["id"],
            "center": {"lat": z["coordinates"][1], "lng": z["coordinates"][0]},
            "avg_price": z["base_price_sqft"],
            "property_count": random.randint(15, 120),
            "growth_signal": z["prosperity_score"],
            "tier": z["classification"]
        })
    trending.sort(key=lambda x: x["growth_signal"], reverse=True)
    return trending[:top_n]

@router.get("/hot-zones")
async def get_hot_zones(top_n: int = 5):
    """
    Returns top hot zones by classification.
    """
    data = urban_engine.get_global_heatmaps()
    hot = [z for z in data["zones"] if z["classification"] == "HOT_GROWTH"]
    hot.sort(key=lambda x: x["prosperity_score"], reverse=True)
    return hot[:top_n]
