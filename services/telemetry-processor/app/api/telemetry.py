from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from typing import Optional, List
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.telemetry import TelemetryData, AggregatedTelemetry, DataSource
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/telemetry/{user_id}")
async def get_user_telemetry(
    user_id: str,
    device_id: Optional[str] = None,
    source: Optional[DataSource] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get telemetry data for a user"""
    try:
        query = select(TelemetryData).where(TelemetryData.user_id == user_id)
        
        if device_id:
            query = query.where(TelemetryData.device_id == device_id)
        if source:
            query = query.where(TelemetryData.source == source)
        if start_time:
            query = query.where(TelemetryData.timestamp >= start_time)
        if end_time:
            query = query.where(TelemetryData.timestamp <= end_time)
            
        query = query.order_by(desc(TelemetryData.timestamp)).limit(limit)
        
        result = await db.execute(query)
        telemetry = result.scalars().all()
        
        return {
            "success": True,
            "data": telemetry,
            "meta": {"count": len(telemetry), "limit": limit}
        }
    except Exception as e:
        logger.error(f"Error fetching telemetry: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/telemetry/{user_id}/summary")
async def get_user_telemetry_summary(
    user_id: str,
    period: str = Query("day", enum=["hour", "day", "week", "month"]),
    db: AsyncSession = Depends(get_db)
):
    """Get aggregated telemetry summary for a user"""
    try:
        # Calculate time range
        end_time = datetime.utcnow()
        if period == "hour":
            start_time = end_time - timedelta(hours=1)
            interval = "1 minute"
        elif period == "day":
            start_time = end_time - timedelta(days=1)
            interval = "1 hour"
        elif period == "week":
            start_time = end_time - timedelta(weeks=1)
            interval = "1 day"
        else:  # month
            start_time = end_time - timedelta(days=30)
            interval = "1 day"
            
        # Query aggregated data by source
        query = select(
            TelemetryData.source,
            func.sum(TelemetryData.energy).label("total_energy"),
            func.avg(TelemetryData.power).label("avg_power"),
            func.max(TelemetryData.power).label("max_power"),
            func.count().label("readings_count")
        ).where(
            and_(
                TelemetryData.user_id == user_id,
                TelemetryData.timestamp >= start_time,
                TelemetryData.timestamp <= end_time
            )
        ).group_by(TelemetryData.source)
        
        result = await db.execute(query)
        rows = result.all()
        
        summary = {
            "period": period,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "sources": {}
        }
        
        for row in rows:
            summary["sources"][row.source.value] = {
                "total_energy_kwh": round(row.total_energy or 0, 3),
                "avg_power_w": round(row.avg_power or 0, 2),
                "max_power_w": round(row.max_power or 0, 2),
                "readings_count": row.readings_count
            }
            
        return {"success": True, "data": summary}
        
    except Exception as e:
        logger.error(f"Error fetching telemetry summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/telemetry/{user_id}/realtime")
async def get_realtime_telemetry(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get latest realtime telemetry for a user"""
    try:
        # Get latest reading for each source
        sources = [DataSource.GRID, DataSource.SOLAR, DataSource.BATTERY, DataSource.LOAD]
        realtime_data = {}
        
        for source in sources:
            query = select(TelemetryData).where(
                and_(
                    TelemetryData.user_id == user_id,
                    TelemetryData.source == source
                )
            ).order_by(desc(TelemetryData.timestamp)).limit(1)
            
            result = await db.execute(query)
            reading = result.scalar_one_or_none()
            
            if reading:
                realtime_data[source.value] = {
                    "power": reading.power,
                    "energy": reading.energy,
                    "voltage": reading.voltage,
                    "current": reading.current,
                    "timestamp": reading.timestamp.isoformat()
                }
                
        return {"success": True, "data": realtime_data}
        
    except Exception as e:
        logger.error(f"Error fetching realtime telemetry: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
