from app.models.escrow_model import EscrowDB
from app.models.shareholder_model import ShareholderDB
from app.models.property_model import PropertyDB
from app.core.database import AsyncSessionLocal
from sqlalchemy.future import select
from sqlalchemy import update, desc
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

async def lock_funds(buyer_wallet: str, amount: float, property_id: str) -> str:
    """
    Simulates locking funds in a smart contract escrow by creating an Escrow record.
    Returns the escrow ID.
    """
    try:
        async with AsyncSessionLocal() as session:
            escrow = EscrowDB(
                property_id=property_id,
                buyer_wallet=buyer_wallet,
                amount=float(amount),
                status="pending",
                lock_expiry=datetime.utcnow() + timedelta(days=1) # 24 hour lock
            )
            session.add(escrow)
            await session.commit()
            await session.refresh(escrow)
            return str(escrow.id)
    except Exception as e:
        logger.error(f"Failed to lock funds for {buyer_wallet} on {property_id}: {e}")
        return None

async def refund_bid(escrow_id: str) -> bool:
    """
    Releases funds back to the user (Simulated).
    """
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(EscrowDB).where(EscrowDB.id == escrow_id))
            escrow = result.scalars().first()
            if not escrow or escrow.status != "pending":
                return False
                
            escrow.status = "refunded"
            await session.commit()
            return True
    except Exception as e:
        logger.error(f"Failed to refund escrow {escrow_id}: {e}")
        return False

async def execute_fractional_purchase(buyer_wallet: str, property_id: str, shares_to_buy: int, escrow_id: str = None) -> bool:
    """
    Finalizes the purchase by deducting shares, creating/updating ShareholderDB, and marking Escrow as completed.
    """
    try:
        async with AsyncSessionLocal() as session:
            # 1. Validate Escrow if provided
            if escrow_id:
                escrow_res = await session.execute(select(EscrowDB).where(EscrowDB.id == escrow_id))
                escrow = escrow_res.scalars().first()
                if not escrow or escrow.status != "pending":
                    logger.warning(f"Invalid or expired escrow {escrow_id}")
                    return False
            else:
                escrow = None

            # 2. Get Property
            import uuid
            pid = property_id
            if isinstance(pid, str):
                try: 
                    pid = uuid.UUID(pid)
                except:
                    pass
            prop_res = await session.execute(select(PropertyDB).where(PropertyDB.id == pid))
            prop = prop_res.scalars().first()
            
            if not prop or not prop.is_fractional:
                return False
                
            if prop.available_shares < shares_to_buy:
                logger.warning(f"Not enough shares available for property {property_id} (requested {shares_to_buy}, got {prop.available_shares})")
                return False
                
            expected_total_price = shares_to_buy * prop.price_per_share
            
            # (Optional) Verify escrow amount covers price
            if escrow and escrow.amount < expected_total_price:
                return False

            # 3. Deduct available shares
            prop.available_shares -= shares_to_buy

            # 4. Check if buyer is already a shareholder
            sh_res = await session.execute(select(ShareholderDB).where(ShareholderDB.property_id == str(prop.id), ShareholderDB.wallet_address == buyer_wallet))
            shareholder = sh_res.scalars().first()

            if shareholder:
                shareholder.shares_owned += shares_to_buy
                # Approximate new average purchase price or just track latest
                shareholder.purchase_price = prop.price_per_share 
            else:
                shareholder = ShareholderDB(
                    property_id=str(prop.id),
                    wallet_address=buyer_wallet,
                    shares_owned=float(shares_to_buy),
                    purchase_price=prop.price_per_share
                )
                session.add(shareholder)
                
            # 5. Deduct shares from original owner's Shareholder record
            owner_sh_res = await session.execute(select(ShareholderDB).where(ShareholderDB.property_id == str(prop.id), ShareholderDB.wallet_address == prop.owner_wallet))
            owner_shareholder = owner_sh_res.scalars().first()
            if owner_shareholder:
                owner_shareholder.shares_owned -= shares_to_buy
                if owner_shareholder.shares_owned <= 0:
                     await session.delete(owner_shareholder) # Just in case they sold 100%

            # 6. Complete Escrow
            if escrow:
                escrow.status = "completed"

            await session.commit()
            return True

    except Exception as e:
        logger.error(f"Error executing fractional purchase: {e}")
        return False

async def resolve_auction_escrows(property_id: str, winner_wallet: str) -> None:
    """
    Marks the winning auction escrow as completed and refunds all other pending escrows for this property.
    """
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(EscrowDB).where(EscrowDB.property_id == property_id, EscrowDB.status == "pending"))
            escrows = result.scalars().all()
            
            for esc in escrows:
                if esc.buyer_wallet == winner_wallet:
                    esc.status = "completed"
                else:
                    esc.status = "refunded"
                    
            await session.commit()
    except Exception as e:
        logger.error(f"Error resolving escrows for property {property_id}: {e}")

