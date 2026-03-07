import os
import joblib
import geopandas as gpd
from shapely.geometry import Point
import numpy as np
import pandas as pd
import warnings
import httpx

# Global variables to hold the loaded data
_wards = None
_saltlake = None
_is_loaded = False

RENDER_API_URL = "https://api-land-price-prediction.onrender.com/predict_point"

# CBD Locations (BBD Bagh, Park Street)
CBD_LOCATIONS = [
    Point(88.3433, 22.5726), # BBD Bagh
    Point(88.3512, 22.5539)  # Park Street
]

def load_ml_resources():
    """
    Loads necessary GeoJSON metadata into memory.
    Core prediction is delegated to the external Render API.
    """
    global _wards, _saltlake, _is_loaded
    if _is_loaded:
        return

    base_dir = os.path.dirname(os.path.abspath(__file__))
    model1_dir = os.path.join(base_dir, "../../model1")

    print("Loading AI metadata resources from model1...")
    
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        # We keep boundaries in EPSG 4326 so we don't need to project points dynamically
        _wards = gpd.read_file(os.path.join(model1_dir, "kolkata_wards.geojson")).to_crs(epsg=4326)
        _saltlake = gpd.read_file(os.path.join(model1_dir, "exportsaltlake.geojson")).to_crs(epsg=4326)
    
    _is_loaded = True
    print("AI metadata resources loaded.")

_prediction_cache = {}

async def get_prediction(lat: float, lng: float) -> dict:
    """
    Delegates prediction to the external Render API and enriches with local metadata.
    Fully asynchronous to allow rapid multi-property prediction on the map.
    """
    if not _is_loaded:
        load_ml_resources()

    cache_key = f"{round(lat, 5)}_{round(lng, 5)}"
    if cache_key in _prediction_cache:
        return _prediction_cache[cache_key]

    # 1. Call External API
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(RENDER_API_URL, json={"lat": lat, "lng": lng})
            resp.raise_for_status()
            api_data = resp.json()
    except Exception as e:
        # print(f"External API Error: {e}") # Silenced to prevent terminal spam during Map sweeps
        # Robust Fallback to a base price if API is down
        api_data = {
            "predicted_price": 7500.0,
            "infra_score": 0.5,
            "access_score": 0.5,
            "demand_score": 0.5,
            "cbd_score": 0.5,
            "river_score": 0.5
        }

    # 2. Local Metadata Enrichment (Wards & Categories)
    point_wgs84 = Point(lng, lat)

    # Use native WGS84 for ultra-fast spatial joins
    ward_info = _wards[_wards.contains(point_wgs84)]
    ward_name = ward_info.iloc[0]["WARD"].strip() if not ward_info.empty else "Unknown"
    # Enrichment Logic
    cbd_score = api_data.get("cbd_score", 0)
    infra = api_data.get("infra_score", 0)
    demand = api_data.get("demand_score", 0)
    access = api_data.get("access_score", 0)
    
    is_saltlake = not _saltlake[_saltlake.contains(point_wgs84)].empty
    is_newtown = "New Town" in ward_name or (lat > 22.56 and lat < 22.62 and lng > 88.44)
    is_premium_ward = ward_name in ["63", "64", "65", "70", "71", "73", "74", "85", "86", "87", "88"]

    zone_category = "Outer"
    if cbd_score > 0.7: zone_category = "CBD"
    elif is_saltlake or is_newtown or is_premium_ward: zone_category = "Premium"
    elif infra > 0.5 or demand > 0.5: zone_category = "Growth"

    predicted_price_sqft = api_data.get("predicted_price", 7500.0)

    # Enhanced AI Metrics
    growth_score = (infra * 0.35 + access * 0.25 + demand * 0.3 + cbd_score * 0.1) * 100
    if is_premium_ward or is_saltlake:
        growth_score += 10
    growth_score = min(growth_score, 100)
    
    # 5-year forecast model (Base 6% inflation + up to 8% growth premium)
    annual_appreciation = 0.06 + (growth_score / 100) * 0.08 
    predicted_5y_price = predicted_price_sqft * ((1 + annual_appreciation) ** 5)
    
    rental_yield = 0.03 + (demand * 0.03) + (1 if is_saltlake else 0) * 0.01

    liquidity_score = min((demand * 0.6 + access * 0.4) * 100, 100)
    
    risk_level = "Low"
    if growth_score < 40 and infra < 0.4: risk_level = "High"
    elif growth_score < 65: risk_level = "Medium"

    investment_score = (growth_score * 0.4) + (liquidity_score * 0.3) + ((rental_yield * 10) * 0.3)
    investment_score = min(investment_score, 100)

    result = {
        "predicted_price": float(predicted_price_sqft),
        "predicted_price_sqm": float(predicted_price_sqft * 10.764),
        "infra_score": float(infra),
        "access_score": float(api_data.get("access_score", 0)),
        "demand_score": float(demand),
        "cbd_score": float(cbd_score),
        "river_score": float(api_data.get("river_score", 0)),
        "ward_name": ward_name,
        "zone_category": zone_category,
        "growth_score": float(growth_score),
        "investment_score": float(investment_score),
        "predicted_5y_price": float(predicted_5y_price),
        "appreciation_rate": float(annual_appreciation),
        "rental_yield": float(rental_yield),
        "liquidity_score": float(liquidity_score),
        "risk_level": risk_level
    }
    
    _prediction_cache[cache_key] = result
    
    if len(_prediction_cache) > 10000:
        _prediction_cache.clear()
        
    return result

def get_auction_intelligence(prediction: dict) -> dict:
    """
    Starting bid engine and auction risk/competition modeling.
    """
    price = prediction["predicted_price"]
    zone = prediction["zone_category"]
    demand = prediction["demand_score"]
    
    # ── Starting Bid Logic ───────────────────────────────────────────────────
    if zone == "CBD": 
        ratio = 0.92 
    elif zone == "Premium": 
        ratio = 0.88
    elif zone == "Growth": 
        ratio = 0.82
    else: 
        ratio = 0.78

    if zone in ["CBD", "Premium"]: ratio += 0.05
    if zone == "Outer" and demand < 0.2: ratio -= 0.03

    recommended_bid = price * ratio

    competition = "Low"
    if demand > 0.7: competition = "High"
    elif demand > 0.3: competition = "Medium"

    return {
        "recommended_starting_bid": round(recommended_bid, 2),
        "suggested_duration_days": 3 if zone == "CBD" else 5 if zone == "Premium" else 7,
        "competition_level": competition,
        "predicted_closing_range": [round(price * 0.95, 2), round(price * 1.15, 2)],
        "risk_rating": "Low" if prediction["infra_score"] > 0.6 else "Medium"
    }

async def predict_property_service(property_id: str) -> dict:
    """
    Integrated property prediction with full intelligence fetching from the database.
    """
    from app.repository.property_repo import get_property_by_id
    prop = await get_property_by_id(property_id)
    
    if not prop:
        return {
            "property_id": property_id,
            "current_price": 0,
            "prediction": await get_prediction(22.5726, 88.3639) # default fallback
        }
        
    lat = prop.get("latitude", 22.5726)
    lng = prop.get("longitude", 88.3639)
    price = prop.get("price", 0)

    prediction_data = await get_prediction(lat, lng)
    
    # Calculate global growth factor against property's current actual price
    current_price = float(price)
    annual_apprec = prediction_data["appreciation_rate"]
    pred_5y_total = current_price * ((1 + annual_apprec) ** 5) if current_price > 0 else 0
    
    prediction_data["predicted_5y_total_value"] = pred_5y_total
    
    # Determine risk from price overvaluation
    ai_predicted_current_total = prediction_data["predicted_price"] * prop.get("area_sqft", 1200)
    
    if current_price > (ai_predicted_current_total * 1.3):
        prediction_data["risk_level"] = "High (Overvalued)"

    return {
        "property_id": property_id,
        "current_price": current_price,
        "prediction": prediction_data
    }
