from typing import Optional, Dict, Any, List
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # App settings
    APP_NAME: str = "tracking-service"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_PORT: int = 8000
    APP_HOST: str = "0.0.0.0"
    
    # MongoDB
    MONGODB_URI: str
    MONGODB_DB: str = "tracking"
    
    # RabbitMQ
    RABBITMQ_URL: str
    RABBITMQ_QUEUE_PREFIX: str = "tracking_service"
    
    # JWT and Authentication
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 3600  # seconds
    
    # Service URLs
    USER_DRIVER_SERVICE_URL: str
    MATCHING_SERVICE_URL: str
    PAYMENT_SERVICE_URL: str
    
    # WebSocket settings
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Logging
    LOG_LEVEL: str = "debug"
    
    # Redis (optional)
    REDIS_URL: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()