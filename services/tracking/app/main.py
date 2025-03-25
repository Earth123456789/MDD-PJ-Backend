# app/main.py

import logging
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from prometheus_fastapi_instrumentator import Instrumentator

from .core.config import get_settings
from app.db import init_database
from app.services.messaging import RabbitMQService
from app.events import setup_event_handlers
from app.api.routes.health import router as health_router
from app.api.routes.tracking import router as tracking_router
from app.api.routes.websocket import router as websocket_router
from app.dependencies import get_location_service, get_order_service


settings = get_settings()

# Setup logging
logging.basicConfig(
    level=logging.getLevelName(settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# Lifespan setup for startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events for the FastAPI application.
    """
    # Startup
    logger.info("Initializing application...")
    
    # Initialize MongoDB Atlas connection
    logger.info("Connecting to MongoDB Atlas...")
    mongo_client = await init_database()
    app.state.mongo_client = mongo_client
    
    # Initialize RabbitMQ connection
    logger.info("Connecting to RabbitMQ...")
    rabbit_service = RabbitMQService()
    await rabbit_service.connect()
    app.state.rabbit_service = rabbit_service
    
    # Initialize services
    location_service = get_location_service()
    order_service = get_order_service()
    
    # Setup event handlers for RabbitMQ
    logger.info("Setting up event handlers...")
    await setup_event_handlers(rabbit_service, location_service, order_service)
    
    logger.info("Application startup complete")
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    
    # Close RabbitMQ connection
    logger.info("Closing RabbitMQ connection...")
    await app.state.rabbit_service.close()
    
    # Close MongoDB connection
    logger.info("Closing MongoDB Atlas connection...")
    await app.state.mongo_client.close()
    
    logger.info("Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Tracking service for real-time driver location tracking",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Add global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error"},
    )

# Mount routers
app.include_router(health_router, tags=["Health"])
app.include_router(tracking_router, prefix="/api/v1", tags=["Tracking"])
app.include_router(websocket_router, prefix="/ws", tags=["WebSocket"])

# Add Prometheus metrics
Instrumentator().instrument(app).expose(app)

# Enable OpenAPI docs
if settings.APP_ENV != "production":
    from fastapi.openapi.docs import get_swagger_ui_html

    @app.get("/docs", include_in_schema=False)
    async def custom_swagger_ui_html():
        """Custom Swagger UI with auth header support."""
        return get_swagger_ui_html(
            openapi_url=app.openapi_url or "/openapi.json",
            title=app.title + " - Swagger UI",
            oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
            swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js",
            swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui.css",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.APP_ENV != "production",
        log_level=settings.LOG_LEVEL.lower(),
    )