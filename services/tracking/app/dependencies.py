# app/dependencies.py

from fastapi import Depends
from typing import Annotated

from app.services.messaging import RabbitMQService
from app.services.location_service import LocationService
from app.services.order_service import OrderService


def get_rabbit_service() -> RabbitMQService:
    """
    Get RabbitMQ service instance.
    """
    # In a real application, you might want to cache this instance
    return RabbitMQService()


def get_location_service() -> LocationService:
    """
    Get location service instance.
    """
    return LocationService()


def get_order_service() -> OrderService:
    """
    Get order service instance.
    """
    return OrderService()


# Create typed dependencies for better IDE support
RabbitServiceDep = Annotated[RabbitMQService, Depends(get_rabbit_service)]
LocationServiceDep = Annotated[LocationService, Depends(get_location_service)]
OrderServiceDep = Annotated[OrderService, Depends(get_order_service)]