from fastapi import APIRouter, Response
from sqlalchemy import text
from app.core.database import engine
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "checks": [
                {"name": "database", "status": "up", "message": "Connected"}
            ]
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return Response(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        )


@router.get("/health/ready")
async def readiness_check():
    """Readiness probe for Kubernetes"""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception:
        return Response(status_code=503, content={"ready": False})


@router.get("/health/live")
async def liveness_check():
    """Liveness probe for Kubernetes"""
    return {"alive": True, "timestamp": datetime.utcnow().isoformat()}
