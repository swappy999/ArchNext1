import statistics

def zone_growth_score(properties: list) -> float:
    """
    Calculates a zone-level growth score based on average property price.
    Higher avg price = higher zone score.
    Score is normalized per 100k (e.g., avg 500k → score 5.0)
    """
    if not properties:
        return 0.0
    
    avg_price = sum(p.get("price", 0) for p in properties) / len(properties)
    score = round(avg_price / 100000, 2)
    
    return score

def zone_summary(properties: list) -> dict:
    """
    Returns a full zone intelligence summary.
    """
    if not properties:
        return {"count": 0, "avg_price": 0, "growth_score": 0.0, "thermal_index": 0.0, "tier": "unknown"}
    
    prices = [p.get("price", 0) for p in properties]
    median_price = statistics.median(prices) if prices else 0
    score = round(median_price / 100000, 2)

    # Improved thermal index based on node density and value (0-1 range)
    price_factor = min(1.0, score / 500) # 5 Cr baseline
    density_factor = min(1.0, len(properties) / 20)
    thermal = (density_factor * 0.4) + (price_factor * 0.6)
    
    # Tier classification
    if score >= 10:
        tier = "Grade A"
    elif score >= 5:
        tier = "Grade B"
    elif score >= 2:
        tier = "Grade C"
    else:
        tier = "Grade D"
    
    return {
        "count": len(properties),
        "avg_price": round(median_price, 2),
        "growth_score": score,
        "thermal_index": round(thermal, 2),
        "tier": tier
    }
