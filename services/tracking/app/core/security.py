# app/core/security.py

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status, Header

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


async def get_token_from_authorization(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Extract the token from the Authorization header.
    
    Args:
        authorization: The Authorization header value
        
    Returns:
        The token if found, None otherwise
    """
    if not authorization:
        return None
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    return parts[1]


def decode_jwt(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: The JWT token to decode
        
    Returns:
        The decoded token payload
        
    Raises:
        HTTPException: If the token is invalid or expired
    """
    try:
        # Decode the token
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Verify expiration
        if "exp" in payload:
            expires = datetime.fromtimestamp(payload["exp"])
            if expires < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Error decoding token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_id(token: str = Depends(get_token_from_authorization)) -> int:
    """
    Get the current user ID from the token.
    
    Args:
        token: The JWT token
        
    Returns:
        The user ID
        
    Raises:
        HTTPException: If the token is invalid or missing
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_jwt(token)
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return int(user_id)


async def get_current_driver_id(token: str = Depends(get_token_from_authorization)) -> int:
    """
    Get the current driver ID from the token.
    
    Args:
        token: The JWT token
        
    Returns:
        The driver ID
        
    Raises:
        HTTPException: If the token is invalid, missing, or not for a driver
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_jwt(token)
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if the user is a driver
    is_driver = payload.get("is_driver", False)
    if not is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Driver authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return int(user_id)


async def get_current_admin(token: str = Depends(get_token_from_authorization)) -> Dict[str, Any]:
    """
    Get the current admin from the token.
    
    Args:
        token: The JWT token
        
    Returns:
        The admin payload
        
    Raises:
        HTTPException: If the token is invalid, missing, or not for an admin
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_jwt(token)
    
    # Check if the user is an admin
    is_admin = payload.get("is_admin", False)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload