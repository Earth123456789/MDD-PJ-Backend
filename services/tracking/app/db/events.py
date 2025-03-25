# app/db/events.py

import logging
from typing import Optional
from beanie import Document
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def on_document_create(document: Document):
    """
    Callback for document creation event.
    
    Args:
        document: The newly created document
    """
    logger.debug(f"Document created: {document.__class__.__name__}")


async def on_document_update(document: Document, update_data: dict):
    """
    Callback for document update event.
    
    Args:
        document: The document being updated
        update_data: Dictionary of update fields
    """
    logger.debug(f"Document updated: {document.__class__.__name__}")


async def on_document_delete(document: Document):
    """
    Callback for document deletion event.
    
    Args:
        document: The document being deleted
    """
    logger.debug(f"Document deleted: {document.__class__.__name__}")


async def validate_unique_email(document: Document):
    """
    Validate unique email constraint.
    
    Args:
        document: The document being validated
    
    Raises:
        ValueError if email is not unique
    """
    if hasattr(document, 'email'):
        existing = await document.__class__.find_one({"email": document.email})
        if existing and existing.id != document.id:
            raise ValueError("Email must be unique")