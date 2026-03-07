from typing import Dict, Any, Literal
import logging
from blockchain.blockchain_service import mint_property_nft, execute_buy, execute_sell, execute_bid

logger = logging.getLogger(__name__)

ChainNetwork = Literal["polygon", "algorand"]
ActionType = Literal["mint", "buy", "sell", "bid"]

async def blockchain_adapter(
    action: ActionType, 
    network: ChainNetwork, 
    payload: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Unified Blockchain Adapter
    Routes hybrid blockchain requests to the appropriate network execution handlers.
    Supports Polygon Amoy and Algorand TestNet.
    """
    logger.info(f"[Blockchain Adapter] Executing '{action}' on network '{network}'")
    
    try:
        if action == "mint":
            # Ensure metadata injection
            if "metadata" not in payload:
                payload["metadata"] = {}
                
            return await mint_property_nft(network, payload)
            
        elif action == "buy":
            return await execute_buy(network, payload)
            
        elif action == "sell":
            return await execute_sell(network, payload)
            
        elif action == "bid":
            return await execute_bid(network, payload)
            
        else:
            raise ValueError(f"Unsupported action: {action}")
            
    except Exception as e:
        logger.error(f"[Blockchain Adapter] Execution failed for {action} on {network}: {e}")
        return {
            "success": False,
            "error": str(e),
            "chain": network,
            "action": action
        }
