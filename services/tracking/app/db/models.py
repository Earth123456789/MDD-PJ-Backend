# app/db/models.py

from typing import List, Type, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum
from pydantic import Field
from beanie import Document, PydanticObjectId, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings

settings = get_settings()


class DriverStatus(str, Enum):
    """Status of a driver."""
    
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    IN_TRANSIT = "IN_TRANSIT"
    ON_BREAK = "ON_BREAK"
    OFFLINE = "OFFLINE"


class OrderStatus(str, Enum):
    """Status of an order."""
    
    PENDING = "PENDING"
    MATCHING = "MATCHING"
    MATCHED = "MATCHED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class GeoPoint(Document):
    """Geographic coordinates with metadata."""
    
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None


class LocationHistory(Document):
    """Location history for a driver."""
    
    driver_id: int
    locations: List[GeoPoint]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    

class DriverLocation(Document):
    """Current driver location."""
    
    driver_id: Union[int, str]  # Accept either int or string IDs
    location: GeoPoint
    status: DriverStatus = DriverStatus.INACTIVE
    heading: Optional[float] = None  # in degrees (0-360)
    speed: Optional[float] = None  # in km/h
    battery_level: Optional[float] = None  # in percentage (0-100)
    current_order_id: Optional[int] = None
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "driver_locations"
        indexes = [
            "driver_id",
            "status",
            "current_order_id",
        ]


class OrderTracking(Document):
    """Order tracking information."""
    
    order_id: int
    user_id: int
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    status: OrderStatus = OrderStatus.PENDING
    pickup_location: GeoPoint
    dropoff_location: GeoPoint
    current_location: Optional[GeoPoint] = None
    estimated_arrival_time: Optional[datetime] = None
    actual_arrival_time: Optional[datetime] = None
    distance_traveled: Optional[float] = None  # in kilometers
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "order_tracking"
        indexes = [
            "order_id",
            "user_id",
            "driver_id",
            "status",
        ]


class TrackingEvent(Document):
    """Tracking events for auditing and analytics."""
    
    event_type: str  # e.g. "location_update", "status_change", "order_delivered"
    driver_id: Optional[int] = None
    order_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    user_id: Optional[int] = None
    location: Optional[GeoPoint] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "tracking_events"
        indexes = [
            "event_type", 
            "driver_id", 
            "order_id",
            "created_at",
        ]


class WebSocketConnection(Document):
    """WebSocket connection information."""
    
    connection_id: str
    user_id: Optional[int] = None
    driver_id: Optional[int] = None
    client_type: str  # "user", "driver", "admin"
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    
    class Settings:
        name = "websocket_connections"
        indexes = [
            "connection_id",
            "user_id",
            "driver_id",
        ]


async def init_database():
    """Initialize the database connection."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    
    await init_beanie(
        database=client[settings.MONGODB_DB],
        document_models=[
            GeoPoint,
            LocationHistory,
            DriverLocation,
            OrderTracking,
            TrackingEvent,
            WebSocketConnection,
        ],
    )