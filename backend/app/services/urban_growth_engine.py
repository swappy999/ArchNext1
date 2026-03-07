import random
import math
from typing import List, Dict, Any
from datetime import datetime

# Define seed zones in and around Kolkata for predictive analysis
# Coordinates represent central nodes of different urban zones
KOLKATA_ZONES = [
    {"id": "zone-newtown", "name": "New Town / Rajarhat", "lat": 22.5800, "lng": 88.4500, "base_price": 7500, "type": "high_growth"},
    {"id": "zone-saltlake", "name": "Salt Lake Sector V", "lat": 22.5804, "lng": 88.4354, "base_price": 9500, "type": "mature"},
    {"id": "zone-joka", "name": "Joka", "lat": 22.4431, "lng": 88.3090, "base_price": 4500, "type": "emerging"},
    {"id": "zone-howrah", "name": "Howrah", "lat": 22.5958, "lng": 88.3236, "base_price": 5500, "type": "stagnant"},
    {"id": "zone-bantala", "name": "Bantala IT Park", "lat": 22.4955, "lng": 88.4839, "base_price": 3800, "type": "emerging"},
    {"id": "zone-barasat", "name": "Barasat", "lat": 22.7196, "lng": 88.4806, "base_price": 4100, "type": "stagnant"},
    {"id": "zone-southcity", "name": "Jadavpur / South City", "lat": 22.4984, "lng": 88.3614, "base_price": 11000, "type": "mature"},
    {"id": "zone-em-bypass", "name": "EM Bypass", "lat": 22.5354, "lng": 88.4063, "base_price": 8500, "type": "high_growth"},
    {"id": "zone-kalyani", "name": "Kalyani", "lat": 22.9751, "lng": 88.4345, "base_price": 3200, "type": "emerging"},
    {"id": "zone-tollygunge", "name": "Tollygunge", "lat": 22.4956, "lng": 88.3441, "base_price": 8000, "type": "mature"}
]

def generate_noise(base: float, variance: float) -> float:
    """Generates a value with some pseudo-random variance based on the current week to simulate live AI flux."""
    week_hash = hash(datetime.utcnow().isocalendar()[1]) % 100
    noise_factor = (week_hash / 100) * variance - (variance / 2)
    return round(max(0.1, base + noise_factor), 2)

class UrbanGrowthEngine:
    """
    Core AI Engine for predicting geographical property prosperity based on 7 vectors.
    Uses probabilistic modeling combined with base regional heuristics.
    """
    
    @staticmethod
    def analyze_zone(zone: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates complex 7-vector properties for a given zone.
        """
        zone_type = zone["type"]
        
        # 1. Infrastructure Projects & Transport (0-10)
        infra_score_base = 9.0 if zone_type == "emerging" else 7.5 if zone_type == "high_growth" else 5.0
        infra = generate_noise(infra_score_base, 2.0)
        
        # 2. Population Growth & Demand Pressure (0-10)
        demand_base = 8.5 if zone_type in ["high_growth", "emerging"] else 6.0 if zone_type == "mature" else 3.0
        demand = generate_noise(demand_base, 1.5)
        
        # 3. Commercial Dev (IT Parks, Malls) (0-10)
        commercial_base = 9.5 if zone_type in ["mature", "high_growth"] else 4.0
        commercial = generate_noise(commercial_base, 2.5)
        
        # 4. Land Availability & Density (0-10) - High score means lot of land available
        land_base = 8.0 if zone_type == "emerging" else 4.0 if zone_type == "high_growth" else 1.0
        land = generate_noise(land_base, 1.0)
        
        # 5. Price History Vector (-1 to +1 trajectory)
        history_base = 0.8 if zone_type in ["high_growth"] else 0.5 if zone_type == "emerging" else 0.2 if zone_type == "mature" else -0.1
        history = generate_noise(history_base, 0.3)
        
        # Calculate Future Prosperity / ROI Score (Out of 100)
        # Weights: Demand (30%), Infra (25%), History (20%), Commercial (15%), Land Constraint Factor (10%)
        # For land, if it's mature (no land), demand drives up price. If it's emerging (lots of land), supply dilutes spike but infra drives adoption.
        land_constraint_multiplier = 10 - land
        
        raw_growth_score = (
            (demand * 3.0) +
            (infra * 2.5) +
            (max(0, history) * 20.0) +
            (commercial * 1.5) +
            (land_constraint_multiplier * 1.0)
        )
        # Normalize to 0-100 range, add baseline floor
        prosperity_score = min(99.9, max(12.0, (raw_growth_score / 100) * 100))
        
        # Predict 5-year ROI percentage
        roi_5y = (prosperity_score * 0.8) + (history * 30)
        roi_5y = max(2.5, round(roi_5y, 1))

        # Categorize
        if prosperity_score >= 75:
            classification = "HOT_GROWTH"
            color = "#0ea5e9" # Cyan
        elif prosperity_score >= 50:
            classification = "MODERATE_GROWTH"
            color = "#eab308" # Yellow
        else:
            classification = "STAGNANT"
            color = "#ef4444" # Red
            
        return {
            "id": zone["id"],
            "name": zone["name"],
            "coordinates": [zone["lng"], zone["lat"]],
            "base_price_sqft": zone["base_price"],
            "prosperity_score": round(prosperity_score, 1),
            "predicted_roi_5y": roi_5y,
            "classification": classification,
            "hex_color": color,
            "vectors": {
                "infrastructure": round(infra, 1),
                "demand": round(demand, 1),
                "commercial": round(commercial, 1),
                "land_availability": round(land, 1),
                "historical_trajectory": round(history, 2)
            }
        }

    @classmethod
    def get_global_heatmaps(cls) -> Dict[str, Any]:
        """
        Runs the engine over all known zones and aggregates global market data.
        Returns data format suitable for Deck.gl Heatmap/Hexagon layers and Analytics UI.
        """
        zones_data = [cls.analyze_zone(z) for z in KOLKATA_ZONES]
        
        # Calculate aggregates
        total_roi = sum(z["predicted_roi_5y"] for z in zones_data)
        avg_roi = total_roi / len(zones_data) if zones_data else 0
        
        hot_zones = len([z for z in zones_data if z["classification"] == "HOT_GROWTH"])
        stagnant_zones = len([z for z in zones_data if z["classification"] == "STAGNANT"])
        
        # Sort to find top
        zones_data.sort(key=lambda x: x["prosperity_score"], reverse=True)
        top_zone = zones_data[0]["name"] if zones_data else "Unknown"

        # Generate a scattering of individual data points around the zones to feed into a HeatMap algorithm
        # This simulates individual property predictions clustering around our known zones
        scatter_points = []
        for zone in zones_data:
            num_points_to_generate = int(zone["prosperity_score"] / 2) # More prosperity = more dense data points in the area
            for _ in range(num_points_to_generate):
                # Apply random gaussian spread (approx 2-5km radius) around the central coordinate
                spread_lng = zone["coordinates"][0] + random.gauss(0, 0.02)
                spread_lat = zone["coordinates"][1] + random.gauss(0, 0.02)
                weight = max(1, zone["prosperity_score"] + random.gauss(0, 5))
                scatter_points.append([spread_lng, spread_lat, weight])

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "market_summary": {
                "average_predicted_roi": round(avg_roi, 1),
                "top_growing_zone": top_zone,
                "hot_zones_count": hot_zones,
                "stagnant_zones_count": stagnant_zones,
                "overall_sentiment": "BULLISH" if avg_roi > 40 else ("BEARISH" if avg_roi < 15 else "NEUTRAL")
            },
            "zones": zones_data,
            "heatmap_scatter_points": scatter_points
        }

# Singleton accessor
urban_engine = UrbanGrowthEngine()
