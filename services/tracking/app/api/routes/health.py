# app/api/routes/health.py

from fastapi import APIRouter, Depends, Request
from typing import Dict, Any
import platform
from datetime import datetime
import psutil
import socket

from app.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/health")
async def health_check(request: Request) -> Dict[str, Any]:
    """
    Basic health check endpoint.
    
    Returns basic information about the service health.
    """
    # Determine service health based on critical dependencies
    mongodb_status = "unknown"
    rabbitmq_status = "unknown"
    
    # Check MongoDB connection
    if hasattr(request.app.state, "mongo_client") and request.app.state.mongo_client:
        if request.app.state.mongo_client.is_connected:
            mongodb_status = "connected"
        else:
            mongodb_status = "disconnected"
    
    # Check RabbitMQ connection
    if hasattr(request.app.state, "rabbit_service") and request.app.state.rabbit_service:
        if request.app.state.rabbit_service.is_connected:
            rabbitmq_status = "connected"
        else:
            rabbitmq_status = "disconnected"
    
    # Determine overall status
    overall_status = "ok"
    if mongodb_status != "connected" or rabbitmq_status != "connected":
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "mongodb": mongodb_status,
            "rabbitmq": rabbitmq_status
        }
    }


@router.get("/health/detailed")
async def detailed_health_check(request: Request) -> Dict[str, Any]:
    """
    Detailed health check endpoint.
    
    Returns detailed information about the service health and connections.
    """
    # Check MongoDB connection
    mongodb_status = "unknown"
    if hasattr(request.app.state, "mongo_client") and request.app.state.mongo_client:
        if request.app.state.mongo_client.is_connected:
            try:
                # Try to ping MongoDB to check real connection status
                ping_result = await request.app.state.mongo_client.ping()
                mongodb_status = "connected" if ping_result else "error"
            except Exception:
                mongodb_status = "error"
        else:
            mongodb_status = "disconnected"
    
    # Check RabbitMQ connection
    rabbitmq_status = "unknown"
    if hasattr(request.app.state, "rabbit_service") and request.app.state.rabbit_service:
        rabbitmq_status = "connected" if request.app.state.rabbit_service.is_connected else "disconnected"
    
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
    
    # Determine overall status
    overall_status = "ok"
    if mongodb_status not in ["connected", "unknown"] or rabbitmq_status not in ["connected", "unknown"]:
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "timestamp": datetime.utcnow().isoformat(),
        "connections": {
            "mongodb": {
                "status": mongodb_status,
                "uri": settings.MONGODB_URI.split('@')[1].split('/')[0] if '@' in settings.MONGODB_URI else "redacted"
            },
            "rabbitmq": {
                "status": rabbitmq_status,
                "host": settings.RABBITMQ_URL.split('@')[1].split(':')[0] if '@' in settings.RABBITMQ_URL else "redacted"
            },
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