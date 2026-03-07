import asyncio
import json
import logging
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast JSON message to all connected clients, cleaning up dead connections."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket client: {e}")
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()


def _register_event_bus_listeners():
    """
    Register the WebSocket broadcaster as a listener on the global property event bus.
    This is the bridge that makes backend state changes visible in real-time on the frontend.
    """
    from app.services.property_state.property_events import property_bus
    from app.services.property_state.property_state_machine import PropertyEvent

    async def on_event(payload: dict):
        await manager.broadcast(payload)

    # Register the WS broadcaster for EVERY property lifecycle event
    for event in PropertyEvent:
        property_bus.on(event, on_event)

    logger.info("✅ Real-time WebSocket bridge connected to property event bus.")


@router.on_event("startup")
async def startup():
    _register_event_bus_listeners()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Send an initial handshake so the frontend knows it's connected
    await websocket.send_json({"event": "CONNECTED", "message": "ArchNext Real-Time stream active."})
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

