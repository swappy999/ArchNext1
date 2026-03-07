from app.core.database import AsyncSessionLocal
from app.models.property_model import PropertyDB
from app.repository.property_repo import _to_dict
from sqlalchemy.future import select

async def get_properties_in_viewport(ne_lng: float, ne_lat: float, sw_lng: float, sw_lat: float) -> list:
    """
    Returns all properties within the map viewport bounding box via PostgreSQL floats.
    """
    async with AsyncSessionLocal() as session:
        stmt = select(PropertyDB).where(
            PropertyDB.latitude >= sw_lat,
            PropertyDB.latitude <= ne_lat,
            PropertyDB.longitude >= sw_lng,
            PropertyDB.longitude <= ne_lng
        ).limit(1000) # Increased limit significantly to get true ward-by-ward data parity
        result = await session.execute(stmt)
        return [_to_dict(p) for p in result.scalars().all()]
