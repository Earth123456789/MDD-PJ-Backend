# app/services/location_service.py

import logging
from typing import List, Type, Optional, Dict, Any, Union
from datetime import datetime
from geopy.distance import geodesic
import httpx
import asyncio

from app.config import get_settings
from app.db.models import (
    GeoPoint, 
    DriverLocation, 
    LocationHistory, 
    DriverStatus,
    TrackingEvent
)

settings = get_settings()
logger = logging.getLogger(__name__)

class ExternalServiceClient:
    """
    Utility class to interact with other microservices for fetching IDs
    """

    @staticmethod
    async def get_driver_by_id(driver_id: str) -> Optional[dict]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{settings.USER_DRIVER_SERVICE_URL}/api/drivers/{driver_id}",
                    timeout=5.0
                )
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch driver {driver_id} from user-driver service: {e}")
        return None

    @staticmethod
    async def get_current_order_for_driver(driver_id: str) -> Optional[str]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{settings.MATCHING_SERVICE_URL}/orders/by-driver/{driver_id}",
                    timeout=5.0
                )
                if response.status_code == 200:
                    return response.json().get("id")
        except Exception as e:
            logger.error(f"Failed to fetch order for driver {driver_id} from matching service: {e}")
        return None


class LocationService:
    """
    Service for handling driver location data.
    """
    
    async def get_driver_location(self, driver_id: str) -> Optional[DriverLocation]:
        """
        Get current location for a driver.
        
        Args:
            driver_id: The ID of the driver
            
        Returns:
            The driver location or None if not found
        """
        return await DriverLocation.find_one({"driver_id": driver_id})
    
    async def validate_driver(self, driver_id: str) -> bool:
        """Validate driver exists in user-driver service."""
        try:
            # In development mode, bypass validation
            if settings.APP_ENV == "development":
                logger.warning(f"Bypassing driver validation for {driver_id} in development mode")
                return True
                
            # Make HTTP request to user-driver service
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{settings.USER_DRIVER_SERVICE_URL}/api/drivers/{driver_id}",
                    headers={"Authorization": f"Bearer {settings.SERVICE_API_KEY}"},
                    timeout=5.0
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Error validating driver {driver_id}: {e}")
            # In production, you should decide whether to fail open or closed
            # For security, failing closed (returning False) is safer
            return False
    
    async def update_driver_location(
        self,
        driver_id: str,
        location: GeoPoint,
        heading: Optional[float] = None,
        speed: Optional[float] = None,
        battery_level: Optional[float] = None,
        status: Optional[DriverStatus] = None,
        vehicle_id: Optional[str] = None,  # Added vehicle_id parameter
    ) -> DriverLocation:
        """Update location for a driver."""
        try:
            # Validate driver exists in user-driver service
            driver_exists = await self.validate_driver(driver_id)
            if not driver_exists:
                logger.warning(f"Driver ID {driver_id} not found in user-driver service")
                raise ValueError(f"Driver ID {driver_id} not found")
        except Exception as e:
            logger.error(f"Error updating driver location: {e}")
            raise
        
        # Save the geo point
        saved_location = await location.save()
        
        # Find existing driver location or create a new one
        driver_location = await DriverLocation.find_one({"driver_id": driver_id})
        
        if driver_location:
            # Add current location to history
            if driver_location.location:
                await self._add_to_location_history(driver_id, driver_location.location, driver_location.vehicle_id)
                
            # Check if we should update status based on previous status and movement
            if status is None and driver_location.location:
                # Calculate distance between old and new location
                old_coords = (driver_location.location.latitude, driver_location.location.longitude)
                new_coords = (location.latitude, location.longitude)
                
                distance = geodesic(old_coords, new_coords).km
                
                # If distance is significant and driver was INACTIVE, change to ACTIVE
                if distance > 0.05 and driver_location.status == DriverStatus.INACTIVE:
                    driver_location.status = DriverStatus.ACTIVE
                    
                    # Log status change
                    await TrackingEvent(
                        event_type="driver_status_auto_updated",
                        driver_id=driver_id,
                        vehicle_id=vehicle_id or driver_location.vehicle_id,  # Include vehicle_id
                        previous_status=DriverStatus.INACTIVE,
                        new_status=DriverStatus.ACTIVE,
                        location=saved_location,
                        metadata={"distance": distance, "reason": "movement_detected"}
                    ).save()
            
            # Update fields
            driver_location.location = saved_location
            driver_location.updated_at = datetime.utcnow()
            driver_location.last_heartbeat = datetime.utcnow()
            
            if heading is not None:
                driver_location.heading = heading
            
            if speed is not None:
                driver_location.speed = speed
            
            if battery_level is not None:
                driver_location.battery_level = battery_level
            
            if status is not None:
                driver_location.status = status
            
            # Update vehicle_id if provided
            if vehicle_id is not None and vehicle_id != driver_location.vehicle_id:
                # Log vehicle change
                await TrackingEvent(
                    event_type="driver_vehicle_changed",
                    driver_id=driver_id,
                    vehicle_id=vehicle_id,
                    previous_status=driver_location.status,
                    metadata={
                        "previous_vehicle_id": driver_location.vehicle_id,
                        "new_vehicle_id": vehicle_id
                    }
                ).save()
                
                driver_location.vehicle_id = vehicle_id
            
            # Save updates
            await driver_location.save()
        
        else:
            # Create new driver location
            driver_location = DriverLocation(
                driver_id=driver_id,
                location=saved_location,
                heading=heading,
                speed=speed,
                battery_level=battery_level,
                status=status or DriverStatus.ACTIVE,  # Default to ACTIVE for new locations
                vehicle_id=vehicle_id,  # Set vehicle_id for new location
                last_heartbeat=datetime.utcnow()
            )
            
            # Save new record
            await driver_location.save()
            
            # Log new driver location
            await TrackingEvent(
                event_type="driver_location_created",
                driver_id=driver_id,
                vehicle_id=vehicle_id,  # Include vehicle_id
                location=saved_location,
                new_status=driver_location.status,
            ).save()
        
        return driver_location

    
    async def _add_to_location_history(self, driver_id: str, location: GeoPoint, vehicle_id: Optional[str] = None):
        """
        Add a location to the driver's location history.
        
        Args:
            driver_id: The ID of the driver
            location: The location to add
            vehicle_id: The vehicle ID (optional)
        """
        # Find today's history record or create a new one
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        history = await LocationHistory.find_one({
            "driver_id": driver_id,
            "created_at": {"$gte": today}
        })
        
        if history:
            # Add to existing history
            history.locations.append(location)
            history.updated_at = datetime.utcnow()
            
            # Update vehicle_id if provided and different
            if vehicle_id is not None and vehicle_id != history.vehicle_id:
                history.vehicle_id = vehicle_id
                
            await history.save()
        else:
            # Create new history record
            history = LocationHistory(
                driver_id=driver_id,
                vehicle_id=vehicle_id,  # Include vehicle_id in history
                locations=[location],
                created_at=today,
                updated_at=datetime.utcnow()
            )
            await history.save()
    
    async def update_driver_vehicle(
    self,
    driver_id: str,
    vehicle_id: Optional[str]
) -> Optional[DriverLocation]:
    """
    Update the current vehicle for a driver.
    
    Args:
        driver_id: The ID of the driver
        vehicle_id: The vehicle ID or None to clear
        
    Returns:
        The updated driver location or None if not found
    """
    driver_location = await DriverLocation.find_one({"driver_id": driver_id})
    
    if not driver_location:
        return None
    
    # Only update if vehicle ID changed
    if driver_location.vehicle_id != vehicle_id:
        previous_vehicle_id = driver_location.vehicle_id
        
        # Update the vehicle ID
        driver_location.vehicle_id = vehicle_id
        driver_location.updated_at = datetime.utcnow()
        await driver_location.save()
        
        # Log vehicle change event
        await TrackingEvent(
            event_type="driver_vehicle_updated",
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            metadata={
                "previous_vehicle_id": previous_vehicle_id,
                "reason": "manual_assignment"
            }
        ).save()
    
    return driver_location
    
    async def get_driver_location_history(
        self,
        driver_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[GeoPoint]:
        """
        Get location history for a driver.
        
        Args:
            driver_id: The ID of the driver
            start_time: Optional start time for filtering
            end_time: Optional end time for filtering
            limit: Maximum number of locations to return
            skip: Number of locations to skip
            
        Returns:
            List of locations
        """
        query = {"driver_id": driver_id}
        
        if start_time or end_time:
            date_query = {}
            if start_time:
                date_query["$gte"] = start_time
            if end_time:
                date_query["$lte"] = end_time
            
            if date_query:
                query["created_at"] = date_query
        
        # Find history records
        histories = await LocationHistory.find(query).to_list()
        
        # Extract all locations
        all_locations = []
        for history in histories:
            all_locations.extend(history.locations)
        
        # Sort by timestamp (newest first)
        all_locations.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply limit and skip
        return all_locations[skip:skip+limit]
    
    async def find_nearby_drivers(
        self,
        latitude: float,
        longitude: float,
        radius: float = 5.0,  # in kilometers
        driver_status: Optional[DriverStatus] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Find drivers near a specific location.
        
        Args:
            latitude: The latitude coordinate
            longitude: The longitude coordinate
            radius: Search radius in kilometers
            driver_status: Optional filter by driver status
            limit: Maximum number of drivers to return
            
        Returns:
            List of drivers with distances
        """
        # Find all active driver locations
        query = {}
        if driver_status:
            query["status"] = driver_status
        
        driver_locations = await DriverLocation.find(query).to_list()
        
        # Calculate distance for each driver
        drivers_with_distance = []
        
        for location in driver_locations:
            if location.location:
                # Calculate distance
                driver_coords = (location.location.latitude, location.location.longitude)
                target_coords = (latitude, longitude)
                
                distance = geodesic(driver_coords, target_coords).km
                
                # Check if within radius
                if distance <= radius:
                    # Add to results
                    drivers_with_distance.append({
                        "driver_id": location.driver_id,
                        "location": {
                            "latitude": location.location.latitude,
                            "longitude": location.location.longitude,
                        },
                        "status": location.status,
                        "distance": round(distance, 2),
                        "heading": location.heading,
                        "updated_at": location.updated_at.isoformat(),
                    })
        
        # Sort by distance
        drivers_with_distance.sort(key=lambda x: x["distance"])
        
        # Apply limit
        return drivers_with_distance[:limit]
    
    async def update_driver_order(
        self,
        driver_id: str,
        order_id: Optional[str]
    ) -> Optional[DriverLocation]:
        """
        Update the current order for a driver.
        
        Args:
            driver_id: The ID of the driver
            order_id: The order ID or None to clear
            
        Returns:
            The updated driver location or None if not found
        """
        driver_location = await DriverLocation.find_one({"driver_id": driver_id})
        
        if not driver_location:
            return None
        
        # Update the current order
        driver_location.current_order_id = order_id
        
        # If order is set, update status to IN_TRANSIT, otherwise ACTIVE
        if order_id:
            previous_status = driver_location.status
            driver_location.status = DriverStatus.IN_TRANSIT
            
            # Log status change if changed
            if previous_status != DriverStatus.IN_TRANSIT:
                await TrackingEvent(
                    event_type="driver_status_updated",
                    driver_id=driver_id,
                    order_id=order_id,
                    previous_status=previous_status,
                    new_status=DriverStatus.IN_TRANSIT,
                    metadata={"reason": "order_assigned"}
                ).save()
        elif driver_location.status == DriverStatus.IN_TRANSIT:
            # Only change status if currently IN_TRANSIT
            previous_status = driver_location.status
            driver_location.status = DriverStatus.ACTIVE
            
            # Log status change
            await TrackingEvent(
                event_type="driver_status_updated",
                driver_id=driver_id,
                previous_status=previous_status,
                new_status=DriverStatus.ACTIVE,
                metadata={"reason": "order_completed"}
            ).save()
        
        # Save updates
        driver_location.updated_at = datetime.utcnow()
        await driver_location.save()
        
        return driver_location
        
    async def get_driver_details_with_google_maps_data(self, driver_id: str) -> Dict[str, Any]:
        """
        Get driver details with Google Maps compatible data.
        
        Args:
            driver_id: The ID of the driver
            
        Returns:
            Driver details with Google Maps data
        """
        driver_location = await self.get_driver_location(driver_id)
        
        if not driver_location or not driver_location.location:
            return None
            
        # Try to fetch additional driver details from the user-driver service
        driver_details = {}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{settings.USER_DRIVER_SERVICE_URL}/api/drivers/{driver_id}",
                    timeout=5.0
                )
                if response.status_code == 200:
                    driver_details = response.json()
        except Exception as e:
            logger.warning(f"Error fetching driver details from user-driver service: {e}")
            
        # Format response for Google Maps
        result = {
            "driver_id": driver_id,
            "position": {
                "lat": driver_location.location.latitude,
                "lng": driver_location.location.longitude
            },
            "heading": driver_location.heading,
            "status": driver_location.status,
            "last_updated": driver_location.updated_at.isoformat(),
            "current_order_id": driver_location.current_order_id,
            # Add driver details if available
            "name": driver_details.get("name", "Unknown Driver"),
            "vehicle": driver_details.get("vehicle", {}),
            "phone": driver_details.get("phone", ""),
            "avatar": driver_details.get("avatar", ""),
        }
        
        return result
    
    async def get_vehicles_by_ids(
    self, 
    vehicle_ids: List[str]
) -> Dict[str, Dict[str, Any]]:
    """
    Get location information for multiple vehicles.
    
    Args:
        vehicle_ids: List of vehicle IDs
    
    Returns:
        Dictionary of vehicle ID -> location info
    """
    results = {}
    
    # Find all driver locations with the given vehicle IDs
    locations = await DriverLocation.find({"vehicle_id": {"$in": vehicle_ids}}).to_list()
    
    for location in locations:
        if location.location:
            results[location.vehicle_id] = {
                "driver_id": location.driver_id,
                "latitude": location.location.latitude,
                "longitude": location.location.longitude,
                "heading": location.heading,
                "speed": location.speed,
                "status": location.status,
                "last_updated": location.updated_at.isoformat(),
                "current_order_id": location.current_order_id
            }
    
    return results

async def find_nearby_vehicles(
    self,
    latitude: float,
    longitude: float,
    radius: float = 5.0,  # in kilometers
    vehicle_type: Optional[str] = None,  # Added vehicle_type filter
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Find vehicles near a specific location.
    
    Args:
        latitude: The latitude coordinate
        longitude: The longitude coordinate
        radius: Search radius in kilometers
        vehicle_type: Optional vehicle type to filter by
        limit: Maximum number of vehicles to return
        
    Returns:
        List of vehicles with distances
    """
    # Find all active driver locations with vehicles
    query = {"status": DriverStatus.ACTIVE, "vehicle_id": {"$ne": None}}
    
    driver_locations = await DriverLocation.find(query).to_list()
    
    # Calculate distance for each vehicle
    vehicles_with_distance = []
    
    for location in driver_locations:
        if location.location and location.vehicle_id:
            # Calculate distance
            driver_coords = (location.location.latitude, location.location.longitude)
            target_coords = (latitude, longitude)
            
            distance = geodesic(driver_coords, target_coords).km
            
            # Check if within radius
            if distance <= radius:
                # If vehicle type filtering is needed, we would need to fetch vehicle info
                # from an external service to check the type
                
                # For now, we'll add all vehicles and assume filtering will happen later
                # if vehicle type information is needed
                
                # Add to results
                vehicles_with_distance.append({
                    "driver_id": location.driver_id,
                    "vehicle_id": location.vehicle_id,
                    "location": {
                        "latitude": location.location.latitude,
                        "longitude": location.location.longitude,
                    },
                    "status": location.status,
                    "distance": round(distance, 2),
                    "heading": location.heading,
                    "updated_at": location.updated_at.isoformat(),
                })
    
    # Sort by distance
    vehicles_with_distance.sort(key=lambda x: x["distance"])
    
    # Apply limit
    return vehicles_with_distance[:limit]