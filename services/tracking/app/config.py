# app/config.py

import os
from typing import List, Optional
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration settings.
    
    Loads configuration from environment variables with sensible defaults.
    """
    # Application settings
    APP_NAME: str = "Tracking Service"
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # Database settings
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "tracking_service"

    # RabbitMQ settings
    RABBITMQ_URL: str = "amqp://guest:guest@localhost/"
    RABBITMQ_QUEUE_PREFIX: str = "tracking_service"

    # JWT settings
    JWT_SECRET: str = "your-secret-key"  # Replace with a strong secret in production
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 30

    # CORS settings
    CORS_ORIGINS: List[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # WebSocket settings
    WS_HEARTBEAT_INTERVAL: int = 30  # Seconds between heartbeats

    # Model configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings getter to avoid reloading environment variables.
    
    Returns:
        Loaded application settings
    """
    return Settings()