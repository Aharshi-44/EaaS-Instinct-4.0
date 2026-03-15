import asyncio
import json
import logging
from aiokafka import AIOKafkaConsumer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.telemetry import TelemetryData, DataSource, DataQuality
from datetime import datetime
from prometheus_client import Counter, Histogram

logger = logging.getLogger(__name__)

# Metrics
messages_consumed = Counter('kafka_messages_consumed_total', 'Total messages consumed from Kafka')
telemetry_stored = Counter('telemetry_stored_total', 'Total telemetry records stored')
processing_duration = Histogram('telemetry_processing_seconds', 'Time spent processing telemetry')


class TelemetryConsumer:
    def __init__(self):
        self.consumer: AIOKafkaConsumer = None
        self.running = False
        
    async def start(self):
        """Start the Kafka consumer"""
        self.consumer = AIOKafkaConsumer(
            settings.KAFKA_TELEMETRY_TOPIC,
            bootstrap_servers=settings.kafka_bootstrap_servers_list,
            group_id=settings.KAFKA_CONSUMER_GROUP,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            auto_commit_interval_ms=5000,
        )
        
        await self.consumer.start()
        self.running = True
        logger.info(f"Kafka consumer started, subscribed to: {settings.KAFKA_TELEMETRY_TOPIC}")
        
        # Start consuming messages
        asyncio.create_task(self._consume())
        
    async def stop(self):
        """Stop the Kafka consumer"""
        self.running = False
        if self.consumer:
            await self.consumer.stop()
        logger.info("Kafka consumer stopped")
        
    async def _consume(self):
        """Consume messages from Kafka"""
        try:
            async for msg in self.consumer:
                if not self.running:
                    break
                    
                with processing_duration.time():
                    try:
                        messages_consumed.inc()
                        await self._process_message(msg.value)
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                        
        except Exception as e:
            logger.error(f"Consumer error: {e}")
            
    async def _process_message(self, data: dict):
        """Process a single telemetry message"""
        try:
            # Parse timestamp
            timestamp_str = data.get('timestamp') or data.get('receivedAt')
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            
            # Create telemetry record
            telemetry = TelemetryData(
                device_id=data.get('deviceId'),
                user_id=data.get('userId'),
                timestamp=timestamp,
                voltage=data.get('metrics', {}).get('voltage'),
                current=data.get('metrics', {}).get('current'),
                power=data.get('metrics', {}).get('power'),
                energy=data.get('metrics', {}).get('energy'),
                frequency=data.get('metrics', {}).get('frequency'),
                power_factor=data.get('metrics', {}).get('powerFactor'),
                temperature=data.get('metrics', {}).get('temperature'),
                source=self._parse_source(data.get('source', 'grid')),
                quality=self._parse_quality(data.get('quality', 'good')),
                meta=data.get('metadata', {}),
            )
            
            # Store in database
            async with AsyncSessionLocal() as session:
                session.add(telemetry)
                await session.commit()
                telemetry_stored.inc()
                
            logger.debug(f"Stored telemetry for device: {telemetry.device_id}")
            
        except Exception as e:
            logger.error(f"Error storing telemetry: {e}")
            raise
            
    def _parse_source(self, source: str) -> DataSource:
        """Parse source string to enum"""
        try:
            return DataSource(source.lower())
        except ValueError:
            return DataSource.GRID
            
    def _parse_quality(self, quality: str) -> DataQuality:
        """Parse quality string to enum"""
        try:
            return DataQuality(quality.lower())
        except ValueError:
            return DataQuality.GOOD


# Global consumer instance
consumer = TelemetryConsumer()
