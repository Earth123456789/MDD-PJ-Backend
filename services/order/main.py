import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from tortoise.exceptions import DoesNotExist, IntegrityError

from routes import api_router
from config.db import init_db, close_db
from config.settings import APP_HOST, APP_PORT, DEBUG

# Configure logging
logging.basicConfig(
    level=logging.INFO if DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Order Service API",
    description="API for managing orders, items, price calculations, and status history",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router)

# Exception handlers
@app.exception_handler(DoesNotExist)
async def does_not_exist_exception_handler(request: Request, exc: DoesNotExist):
    return JSONResponse(
        status_code=404,
        content={"message": str(exc)},
    )


@app.exception_handler(IntegrityError)
async def integrity_error_exception_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=400,
        content={"message": str(exc)},
    )


@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the application")
    await init_db()
    logger.info("Database initialized")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the application")
    await close_db()
    logger.info("Database connections closed")


@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to the Order Service API. Go to /docs for API documentation."}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=APP_HOST,
        port=APP_PORT,
        reload=DEBUG,
        log_level="info" if DEBUG else "warning",
    )