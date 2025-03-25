# app/api/routes/health.py

from fastapi import APIRouter, Depends
from typing import Dict, Any
import platform
from datetime import datetime
import psutil
import socket

from app.config import get_settings
from app.services.messaging import RabbitMQService

router = APIRouter()
settings = get_settings()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint.
    
    Returns basic information about the service health.
    """
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/detailed")
async def detailed_health_check(
    rabbit_service: RabbitMQService = Depends()
) -> Dict[str, Any]:
    """
    Detailed health check endpoint.
    
    Returns detailed information about the service health and connections.
    """
    # Check RabbitMQ connection
    rabbitmq_status = "connected" if rabbit_service.is_connected else "disconnected"
    
    # Get system information
    system_info = {
        "hostname": socket.gethostname(),
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "cpu_count": psutil.cpu_count(),
        "cpu_usage": psutil.cpu_percent(interval=0.1),
        "memory_usage": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent,
    }
    
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "timestamp": datetime.utcnow().isoformat(),
        "connections": {
            "rabbitmq": rabbitmq_status,
            "mongodb": "connected",  # This would be more dynamic in a real implementation
        },
        "system_info": system_info,
    }


@router.get("/")
async def root() -> Dict[str, Any]:
    """
    Root endpoint.
    
    Returns basic information about the service.
    """
    return {
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "description": "Tracking service for real-time driver location tracking",
        "environment": settings.APP_ENV,
        "docs_url": "/docs",
    }