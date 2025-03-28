from app.db.models import (
    GeoPoint,
    LocationHistory,
    DriverLocation,
    OrderTracking,
    TrackingEvent,
    WebSocketConnection
)
from app.db.mongodb_atlas import init_mongodb_atlas


async def init_database():
    """Initialize database connection."""
    return await init_mongodb_atlas([
        GeoPoint,
        LocationHistory,
        DriverLocation,
        OrderTracking,
        TrackingEvent,
        WebSocketConnection
    ])