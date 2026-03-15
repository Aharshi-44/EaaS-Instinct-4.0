import { Kafka, Producer } from 'kafkajs';
import logger from '../utils/logger';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'telemetry-ingest';
const KAFKA_TELEMETRY_TOPIC = process.env.KAFKA_TELEMETRY_TOPIC || 'energy-telemetry';

class KafkaProducer {
  private producer: Producer;
  private isConnected: boolean = false;

  constructor() {
    const kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: KAFKA_BROKERS,
    });
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Connected to Kafka');
    } catch (error) {
      logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from Kafka');
    }
  }

  async sendTelemetry(data: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      await this.producer.send({
        topic: KAFKA_TELEMETRY_TOPIC,
        messages: [
          {
            key: data.deviceId,
            value: JSON.stringify(data),
            timestamp: Date.now().toString(),
          },
        ],
      });
      logger.debug(`Telemetry sent to Kafka for device: ${data.deviceId}`);
    } catch (error) {
      logger.error('Failed to send telemetry to Kafka:', error);
      throw error;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const kafkaProducer = new KafkaProducer();
