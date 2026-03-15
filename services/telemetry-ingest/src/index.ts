import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { createMqttClient } from './services/mqttClient';
import { kafkaProducer } from './services/kafkaProducer';
import logger from './utils/logger';
import client from 'prom-client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const messagesReceived = new client.Counter({
  name: 'mqtt_messages_received_total',
  help: 'Total MQTT messages received',
  labelNames: ['topic'],
});
const messagesPublished = new client.Counter({
  name: 'kafka_messages_published_total',
  help: 'Total Kafka messages published',
  labelNames: ['topic'],
});
const messageProcessingDuration = new client.Histogram({
  name: 'message_processing_duration_seconds',
  help: 'Message processing duration',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});
register.registerMetric(messagesReceived);
register.registerMetric(messagesPublished);
register.registerMetric(messageProcessingDuration);

// Start MQTT to Kafka bridge
const startBridge = async () => {
  try {
    // Connect to Kafka
    await kafkaProducer.connect();

    // Connect to MQTT
    const mqttClient = createMqttClient();

    // Subscribe to telemetry topics
    const topics = ['energix/devices/+/telemetry', 'energix/devices/+/status'];

    mqttClient.on('connect', () => {
      topics.forEach((topic) => {
        mqttClient.subscribe(topic, (err) => {
          if (err) {
            logger.error(`Failed to subscribe to ${topic}:`, err);
          } else {
            logger.info(`Subscribed to MQTT topic: ${topic}`);
          }
        });
      });
    });

    // Handle incoming messages
    mqttClient.on('message', async (topic, message) => {
      const endTimer = messageProcessingDuration.startTimer();
      try {
        messagesReceived.inc({ topic });

        const data = JSON.parse(message.toString());
        const enrichedData = {
          ...data,
          receivedAt: new Date().toISOString(),
          mqttTopic: topic,
        };

        // Publish to Kafka
        await kafkaProducer.sendTelemetry(enrichedData);
        messagesPublished.inc({ topic: 'energy-telemetry' });

        logger.debug(`Forwarded message from ${topic} to Kafka`);
      } catch (error) {
        logger.error('Error processing MQTT message:', error);
      } finally {
        endTimer();
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down...');
      mqttClient.end();
      await kafkaProducer.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down...');
      mqttClient.end();
      await kafkaProducer.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start bridge:', error);
    process.exit(1);
  }
};

// HTTP server for health checks and metrics
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: kafkaProducer.getConnectionStatus() ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    kafkaConnected: kafkaProducer.getConnectionStatus(),
  });
});

app.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'telemetry-ingest',
    version: '1.0.0',
    status: 'running',
    kafkaConnected: kafkaProducer.getConnectionStatus(),
  });
});

app.listen(PORT, () => {
  logger.info(`Telemetry ingest service running on port ${PORT}`);
});

// Start the bridge
startBridge();
