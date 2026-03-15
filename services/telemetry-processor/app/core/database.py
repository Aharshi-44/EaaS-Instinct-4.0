from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables and hypertables"""
    async with engine.begin() as conn:
        # DEV-friendly reset: ensure schema matches current models.
        # TimescaleDB hypertables require PK/unique indexes to include the partitioning column.
        await conn.execute(text("DROP TABLE IF EXISTS telemetry_data CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS aggregated_telemetry CASCADE;"))

        # Create tables
        await conn.run_sync(Base.metadata.create_all)
        
        # Create hypertable for telemetry data if not exists
        await conn.execute(text("""
            SELECT create_hypertable('telemetry_data', 'timestamp', 
                if_not_exists => TRUE,
                migrate_data => TRUE
            );
        """))
        
        # Create hypertable for aggregated data
        await conn.execute(text("""
            SELECT create_hypertable('aggregated_telemetry', 'bucket',
                if_not_exists => TRUE,
                migrate_data => TRUE
            );
        """))
        
        logger.info("Database initialized successfully")


async def close_db():
    """Close database connections"""
    await engine.dispose()
    logger.info("Database connections closed")
