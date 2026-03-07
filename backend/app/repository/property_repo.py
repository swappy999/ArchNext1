from app.models.property_model import PropertyDB
from app.models.shareholder_model import ShareholderDB
from app.core.database import AsyncSessionLocal
from sqlalchemy.future import select
from sqlalchemy import update, delete
from typing import List, Optional
import logging
import uuid

logger = logging.getLogger(__name__)

async def tokenize_property(property_id: str, owner_id: str, total_shares: int, price_per_share: float) -> bool:
    try:
        pid = property_id
        if isinstance(pid, str):
            try:
                pid = uuid.UUID(pid)
            except ValueError:
                pass
                
        async with AsyncSessionLocal() as session:
            # Check property
            result = await session.execute(select(PropertyDB).where(PropertyDB.id == pid, PropertyDB.owner_id == owner_id))
            prop = result.scalars().first()
            
            if not prop:
                return False
                
            if prop.is_fractional:
                return False # already fractionalized
                
            # Update property fields
            prop.is_fractional = 1.0
            prop.total_shares = float(total_shares)
            prop.available_shares = float(total_shares)
            prop.price_per_share = float(price_per_share)
            
            # Create original shareholder record (owner holds 100% initially to be sold)
            # Actually, to make it available for sale, owner doesn't need a shareholder record
            # until they keep some shares. But let's create a record showing they own 100% implicitly
            sh = ShareholderDB(
                property_id=str(prop.id),
                wallet_address=prop.owner_wallet or owner_id,
                shares_owned=float(total_shares),
                purchase_price=0.0
            )
            session.add(sh)
            await session.commit()
            return True
            
    except Exception as e:
        logger.error(f"Error tokenizing property {property_id}: {e}")
        return False

def _to_dict(prop: PropertyDB):
    if not prop:
        return None
    d = prop.__dict__.copy()
    d["id"] = str(prop.id)
    d["_id"] = str(prop.id)
    d["location"] = {"type": "Point", "coordinates": [prop.longitude, prop.latitude]}
    d.pop("_sa_instance_state", None)
    return d

async def create_property(data: dict) -> dict:
    # Ensure nested location dict is extracted into lat/lng floats
    if "location" in data and "coordinates" in data["location"]:
        coords = data["location"]["coordinates"]
        data["longitude"] = coords[0]
        data["latitude"] = coords[1]
        del data["location"]
        
    async with AsyncSessionLocal() as session:
        prop = PropertyDB(**data)
        session.add(prop)
        await session.commit()
        await session.refresh(prop)
        return _to_dict(prop)

async def get_all_properties() -> List[dict]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(PropertyDB))
        return [_to_dict(p) for p in result.scalars().all()]

async def get_property_by_id(property_id: str) -> Optional[dict]:
    try:
        # Cast to UUID if string to ensure postgres compatibility
        import uuid
        if isinstance(property_id, str):
            try:
                property_id = uuid.UUID(property_id)
            except ValueError:
                pass
                
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(PropertyDB).where(PropertyDB.id == property_id))
            return _to_dict(result.scalars().first())
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Repository Error [get_property_by_id]: {e}")
        return None

async def update_property(property_id: str, data: dict) -> bool:
    import uuid
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        if isinstance(property_id, str):
            try:
                property_id = uuid.UUID(property_id)
            except ValueError:
                logger.warning(f"Invalid UUID string passed to update_property: {property_id}")
                pass

        if "location" in data and "coordinates" in data["location"]:
            coords = data["location"]["coordinates"]
            data["longitude"] = coords[0]
            data["latitude"] = coords[1]
            del data["location"]
            
        async with AsyncSessionLocal() as session:
            stmt = update(PropertyDB).where(PropertyDB.id == property_id).values(**data)
            result = await session.execute(stmt)
            await session.commit()
            
            if result.rowcount == 0:
                logger.warning(f"No rows updated for property_id: {property_id}. Check if ID exists.")
            
            return result.rowcount > 0
    except Exception as e:
        logger.error(f"DATABASE UPDATE CRASH [update_property]: {e} | ID: {property_id} | data keys: {list(data.keys())}")
        return False

async def delete_property_repo(property_id: str) -> bool:
    try:
        import uuid
        if isinstance(property_id, str):
            try:
                property_id = uuid.UUID(property_id)
            except ValueError:
                pass

        async with AsyncSessionLocal() as session:
            stmt = delete(PropertyDB).where(PropertyDB.id == property_id)
            result = await session.execute(stmt)
            await session.commit()
            return result.rowcount > 0
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Repository Error [delete_property_repo]: {e}")
        return False

async def get_nearby_properties(long: float, lat: float, radius: int = 5000) -> List[dict]:
    # 1 degree of latitude is roughly 111km. 
    # Therefore, 1 meter is roughly 1/111000 degrees.
    # We use a bounding box filter for fast spatial querying without PostGIS
    lat_offset = radius / 111000.0
    long_offset = radius / 111000.0  # Appx, valid strictly near equator but good enough map filter
    
    async with AsyncSessionLocal() as session:
        stmt = select(PropertyDB).where(
            PropertyDB.latitude >= lat - lat_offset,
            PropertyDB.latitude <= lat + lat_offset,
            PropertyDB.longitude >= long - long_offset,
            PropertyDB.longitude <= long + long_offset
        )
        result = await session.execute(stmt)
        return [_to_dict(p) for p in result.scalars().all()]

async def filter_properties(min_price: float = None, max_price: float = None) -> List[dict]:
    async with AsyncSessionLocal() as session:
        stmt = select(PropertyDB)
        if min_price is not None:
            stmt = stmt.where(PropertyDB.price >= min_price)
        if max_price is not None:
            stmt = stmt.where(PropertyDB.price <= max_price)
            
        result = await session.execute(stmt)
        return [_to_dict(p) for p in result.scalars().all()]
