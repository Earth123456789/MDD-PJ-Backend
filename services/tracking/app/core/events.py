# app/core/events.py

from enum import Enum, auto
from typing import Dict, Any
from datetime import datetime


class EventType(Enum):
    """
    Enumeration of core event types in the system.
    """
    # Driver-related events
    DRIVER_LOCATION_UPDATED = auto()
    DRIVER_STATUS_CHANGED = auto()
    DRIVER_ONLINE = auto()
    DRIVER_OFFLINE = auto()
    
    # Order-related events
    ORDER_CREATED = auto()
    ORDER_UPDATED = auto()
    ORDER_CANCELLED = auto()
    ORDER_MATCHED = auto()
    ORDER_IN_TRANSIT = auto()
    ORDER_DELIVERED = auto()
    
    # Tracking-related events
    TRACKING_STARTED = auto()
    TRACKING_STOPPED = auto()
    
    # Connection-related events
    WEB_SOCKET_CONNECTED = auto()
    WEB_SOCKET_DISCONNECTED = auto()


class EventMetadata:
    """
    Helper class for creating standard event metadata.
    """
    @staticmethod
    def create(
        event_type: EventType,
        user_id: int = None,
        driver_id: int = None,
        order_id: int = None,
        additional_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create a standardized event metadata dictionary.
        
        Args:
            event_type: The type of event
            user_id: Optional user ID associated with the event
            driver_id: Optional driver ID associated with the event
            order_id: Optional order ID associated with the event
            additional_data: Optional additional metadata
        
        Returns:
            A dictionary containing event metadata
        """
        metadata = {
            "event_type": event_type.name,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if user_id is not None:
            metadata["user_id"] = user_id
        
        if driver_id is not None:
            metadata["driver_id"] = driver_id
        
        if order_id is not None:
            metadata["order_id"] = order_id
        
        if additional_data:
            metadata.update(additional_data)
        
        return metadata