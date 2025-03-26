import logging
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from prometheus_fastapi_instrumentator import Instrumentator
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi

# Fix the import path for config
from app.config import get_settings
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
    # Initialize services with fallback mechanisms
    try:
        # Startup
        logger.info("Initializing application...")
        
        # Initialize MongoDB Atlas connection
        logger.info("Connecting to MongoDB Atlas...")
        try:
            mongo_client = await init_database()
            app.state.mongo_client = mongo_client
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB Atlas: {e}")
            logger.warning("Application will run with limited functionality")
            app.state.mongo_client = None
        
        # Initialize RabbitMQ connection
        logger.info("Connecting to RabbitMQ...")
        try:
            rabbit_service = RabbitMQService()
            await rabbit_service.connect()
            app.state.rabbit_service = rabbit_service
            
            # Initialize services
            location_service = get_location_service()
            order_service = get_order_service()
            
            # Setup event handlers for RabbitMQ
            if rabbit_service.is_connected:
                logger.info("Setting up event handlers...")
                try:
                    await setup_event_handlers(rabbit_service, location_service, order_service)
                except Exception as e:
                    logger.error(f"Failed to set up event handlers: {e}")
                    logger.warning("Event-based functionality will be limited")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            logger.warning("Event-based functionality will be unavailable")
            app.state.rabbit_service = None
        
        logger.info("Application startup complete (with available services)")
        yield
        
        # Shutdown
        logger.info("Shutting down...")
        
        # Close RabbitMQ connection
        if hasattr(app.state, 'rabbit_service') and app.state.rabbit_service:
            logger.info("Closing RabbitMQ connection...")
            await app.state.rabbit_service.close()
        
        # Close MongoDB connection
        if hasattr(app.state, 'mongo_client') and app.state.mongo_client:
            logger.info("Closing MongoDB Atlas connection...")
            await app.state.mongo_client.close()
        
        logger.info("Application shutdown complete")
    
    except Exception as e:
        logger.error(f"Error during application lifecycle: {e}")
        # Yield control back to ensure FastAPI can continue
        yield
        logger.info("Application shutdown (after error)")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Tracking service for real-time driver location tracking",
    version="1.0.0",
    lifespan=lifespan,
    # Disable default docs to customize them with auth
    docs_url=None,
    redoc_url=None,
    openapi_url="/openapi.json",
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

# Custom OpenAPI schema with security definitions
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Ensure the openapi version is set
    openapi_schema["openapi"] = "3.0.3"
    
    # Add JWT Bearer security scheme
    openapi_schema["components"] = {
        "securitySchemes": {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "Enter your JWT token in the format 'Bearer {token}'",
            }
        }
    }
    
    # Apply security globally to all operations
    openapi_schema["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Custom Swagger UI with support for Bearer token authentication
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI with auth header support."""
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui.css",
        swagger_favicon_url="/favicon.ico",
        init_oauth={
            "usePkceWithAuthorizationCodeGrant": True,
        }
    )

# ReDoc UI
@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    """ReDoc UI endpoint."""
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=app.title + " - ReDoc",
        swagger_js_url="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.styles.css",
        swagger_ui_parameters={"theme": "default"}
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