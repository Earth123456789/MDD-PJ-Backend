# app/dependencies.py

from fastapi import Depends
from typing import Annotated

from app.services.location_service import LocationService
from app.services.order_service import OrderService
from app.services.messaging import RabbitMQService


def get_location_service() -> LocationService:
    """
    Dependency injection for LocationService.
    
    Returns:
        A LocationService instance
    """
    return LocationService()


def get_order_service() -> OrderService:
    """
    Dependency injection for OrderService.
    
    Returns:
        An OrderService instance
    """
    return OrderService()


def get_rabbitmq_service() -> RabbitMQService:
    """
    Dependency injection for RabbitMQService.
    
    Returns:
        A RabbitMQService instance
    """
    return RabbitMQService()


# Type annotations for common dependencies
LocationServiceDep = Annotated[LocationService, Depends(get_location_service)]
OrderServiceDep = Annotated[OrderService, Depends(get_order_service)]
RabbitMQServiceDep = Annotated[RabbitMQService, Depends(get_rabbitmq_service)]