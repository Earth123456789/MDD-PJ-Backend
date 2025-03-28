# app/websockets/manager.py

import json
import logging
import asyncio
import uuid
from typing import Dict, Set, List, Optional, Any
from datetime import datetime, timedelta
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ValidationError

from app.config import get_settings
from app.db.models import WebSocketConnection, TrackingEvent

settings = get_settings()
logger = logging.getLogger(__name__)


class WebSocketMessage(BaseModel):
    """Schema for WebSocket messages."""
    
    type: str
    data: Dict[str, Any]
    timestamp: datetime = datetime.utcnow()


class ConnectionManager:
    """
    Manages WebSocket connections and communication.
    """
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.driver_connections: Dict[str, Set[str]] = {}  # driver_id -> set of connection_ids
        self.user_connections: Dict[str, Set[str]] = {}  # user_id -> set of connection_ids
        self.order_subscribers: Dict[str, Set[str]] = {}  # order_id -> set of connection_ids
        self.heartbeat_task = None
    
    async def connect(
        self, 
        websocket: WebSocket, 
        connection_id: str,
        client_type: str,
        user_id: Optional[str] = None,
        driver_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> str:
        """
        Handle new WebSocket connection.
        
        Args:
            websocket: The WebSocket connection
            connection_id: Unique identifier for this connection
            client_type: Type of client ("user", "driver", "admin")
            user_id: ID of the user (if applicable)
            driver_id: ID of the driver (if applicable)
            user_agent: User agent string from the client
            ip_address: IP address of the client
            
        Returns:
            connection_id: The connection ID (generated if not provided)
        """
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        
        # Store connection in database
        await WebSocketConnection(
            connection_id=connection_id,
            user_id=user_id,
            driver_id=driver_id,
            client_type=client_type,
            user_agent=user_agent,
            ip_address=ip_address,
        ).save()
        
        # Add to appropriate mappings
        if driver_id:
            if driver_id not in self.driver_connections:
                self.driver_connections[driver_id] = set()
            self.driver_connections[driver_id].add(connection_id)
            
            # Log driver connection
            await TrackingEvent(
                event_type="driver_websocket_connected",
                driver_id=driver_id,
                metadata={
                    "connection_id": connection_id,
                    "user_agent": user_agent,
                    "ip_address": ip_address,
                }
            ).save()
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(connection_id)
            
            # Log user connection
            await TrackingEvent(
                event_type="user_websocket_connected",
                user_id=user_id,
                metadata={
                    "connection_id": connection_id,
                    "user_agent": user_agent,
                    "ip_address": ip_address,
                }
            ).save()
        
        logger.info(f"Client connected: {connection_id} ({client_type})")
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """
        Handle WebSocket disconnection.
        
        Args:
            connection_id: The connection ID to disconnect
        """
        # Remove from active connections
        if connection_id in self.active_connections:
            websocket = self.active_connections.pop(connection_id)
            
            # Get connection info from database
            conn = await WebSocketConnection.find_one({"connection_id": connection_id})
            if conn:
                # Remove from appropriate mappings
                if conn.driver_id and conn.driver_id in self.driver_connections:
                    self.driver_connections[conn.driver_id].discard(connection_id)
                    if not self.driver_connections[conn.driver_id]:
                        del self.driver_connections[conn.driver_id]
                
                if conn.user_id and conn.user_id in self.user_connections:
                    self.user_connections[conn.user_id].discard(connection_id)
                    if not self.user_connections[conn.user_id]:
                        del self.user_connections[conn.user_id]
                
                # Clean up order subscriptions
                for order_id, subscribers in list(self.order_subscribers.items()):
                    subscribers.discard(connection_id)
                    if not subscribers:
                        del self.order_subscribers[order_id]
                
                # Log disconnect event
                event_type = "driver_websocket_disconnected" if conn.driver_id else "user_websocket_disconnected"
                await TrackingEvent(
                    event_type=event_type,
                    driver_id=conn.driver_id,
                    user_id=conn.user_id,
                    metadata={"connection_id": connection_id}
                ).save()
            
            logger.info(f"Client disconnected: {connection_id}")
    
    async def send_message(self, connection_id: str, message: Dict[str, Any]):
        """
        Send a message to a specific connection.
        
        Args:
            connection_id: The connection ID to send to
            message: The message to send
        """
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_json(message)
                return True
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                await self.disconnect(connection_id)
                return False
        return False
    
    async def broadcast_to_drivers(self, driver_ids: List[str], message: Dict[str, Any]):
        """
        Broadcast a message to multiple drivers.
        
        Args:
            driver_ids: List of driver IDs to send to
            message: The message to send
        """
        for driver_id in driver_ids:
            await self.send_to_driver(driver_id, message)
    
    async def send_to_driver(self, driver_id: str, message: Dict[str, Any]):
        """
        Send a message to all connections for a specific driver.
        
        Args:
            driver_id: The driver ID
            message: The message to send
        """
        if driver_id in self.driver_connections:
            disconnected = []
            for conn_id in self.driver_connections[driver_id]:
                success = await self.send_message(conn_id, message)
                if not success:
                    disconnected.append(conn_id)
            
            # Clean up any failed connections
            for conn_id in disconnected:
                await self.disconnect(conn_id)
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """
        Send a message to all connections for a specific user.
        
        Args:
            user_id: The user ID
            message: The message to send
        """
        if user_id in self.user_connections:
            disconnected = []
            for conn_id in self.user_connections[user_id]:
                success = await self.send_message(conn_id, message)
                if not success:
                    disconnected.append(conn_id)
            
            # Clean up any failed connections
            for conn_id in disconnected:
                await self.disconnect(conn_id)
    
    async def broadcast_order_update(self, order_id: str, message: Dict[str, Any]):
        """
        Broadcast an order update to all subscribers.
        
        Args:
            order_id: The order ID
            message: The message to send
        """
        if order_id in self.order_subscribers:
            disconnected = []
            for conn_id in self.order_subscribers[order_id]:
                success = await self.send_message(conn_id, message)
                if not success:
                    disconnected.append(conn_id)
            
            # Clean up any failed connections
            for conn_id in disconnected:
                self.order_subscribers[order_id].discard(conn_id)
    
    async def subscribe_to_order(self, connection_id: str, order_id: str):
        """
        Subscribe a connection to order updates.
        
        Args:
            connection_id: The connection ID
            order_id: The order ID to subscribe to
        """
        if order_id not in self.order_subscribers:
            self.order_subscribers[order_id] = set()
        self.order_subscribers[order_id].add(connection_id)
    
    async def unsubscribe_from_order(self, connection_id: str, order_id: str):
        """
        Unsubscribe a connection from order updates.
        
        Args:
            connection_id: The connection ID
            order_id: The order ID to unsubscribe from
        """
        if order_id in self.order_subscribers:
            self.order_subscribers[order_id].discard(connection_id)
            if not self.order_subscribers[order_id]:
                del self.order_subscribers[order_id]
    
    async def start_heartbeat(self):
        """Start the heartbeat task to detect stale connections."""
        if self.heartbeat_task is None or self.heartbeat_task.done():
            self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
    
    async def _heartbeat_loop(self):
        """Send periodic heartbeats to detect stale connections."""
        while True:
            try:
                await asyncio.sleep(settings.WS_HEARTBEAT_INTERVAL)
                await self._send_heartbeats()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}")
    
    async def _send_heartbeats(self):
        """Send heartbeats to all active connections."""
        heartbeat_message = {
            "type": "heartbeat",
            "data": {"timestamp": datetime.utcnow().isoformat()},
        }
        
        disconnected = []
        for conn_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(heartbeat_message)
                
                # Update last activity timestamp
                conn = await WebSocketConnection.find_one({"connection_id": conn_id})
                if conn:
                    conn.last_activity = datetime.utcnow()
                    await conn.save()
                
            except Exception as e:
                logger.warning(f"Heartbeat failed for {conn_id}: {e}")
                disconnected.append(conn_id)
        
        # Clean up failed connections
        for conn_id in disconnected:
            await self.disconnect(conn_id)
        
        # Log heartbeat stats
        logger.debug(f"Heartbeat sent to {len(self.active_connections)} connections, {len(disconnected)} disconnected")