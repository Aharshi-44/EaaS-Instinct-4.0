from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "telemetry-processor"
    DEBUG: bool = False
    LOG_LEVEL: str = "info"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 3006
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/energix_telemetry"
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_CONSUMER_GROUP: str = "telemetry-processor"
    KAFKA_TELEMETRY_TOPIC: str = "energy-telemetry"
    
    # Aggregation
    AGGREGATION_INTERVAL_MINUTES: int = 5
    
    @property
    def kafka_bootstrap_servers_list(self) -> List[str]:
        return [s.strip() for s in self.KAFKA_BOOTSTRAP_SERVERS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
