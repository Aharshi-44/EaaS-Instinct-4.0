from sqlalchemy import Column, String, Float, DateTime, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
from enum import Enum


class DataSource(str, Enum):
    GRID = "grid"
    SOLAR = "solar"
    BATTERY = "battery"
    LOAD = "load"


class DataQuality(str, Enum):
    GOOD = "good"
    POOR = "poor"
    SUSPECT = "suspect"
    MISSING = "missing"


class TelemetryData(Base):
    __tablename__ = "telemetry_data"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(String(255), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    # TimescaleDB hypertables require any UNIQUE/PK index to include the partition column.
    timestamp = Column(DateTime(timezone=True), primary_key=True, nullable=False, index=True)
    
    # Metrics
    voltage = Column(Float)
    current = Column(Float)
    power = Column(Float)
    energy = Column(Float)
    frequency = Column(Float)
    power_factor = Column(Float)
    temperature = Column(Float)
    
    source = Column(SQLEnum(DataSource), nullable=False)
    quality = Column(SQLEnum(DataQuality), default=DataQuality.GOOD)
    meta = Column("metadata", JSONB)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AggregatedTelemetry(Base):
    __tablename__ = "aggregated_telemetry"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    device_id = Column(String(255), nullable=False, index=True)
    # Same constraint for hypertables partitioned by bucket.
    bucket = Column(DateTime(timezone=True), primary_key=True, nullable=False, index=True)
    interval_minutes = Column(Integer, nullable=False)
    
    # Aggregated metrics
    avg_voltage = Column(Float)
    avg_current = Column(Float)
    avg_power = Column(Float)
    total_energy = Column(Float, nullable=False)
    max_power = Column(Float)
    min_power = Column(Float)
    
    source = Column(SQLEnum(DataSource), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
