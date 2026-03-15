import mqtt from 'mqtt';
import logger from '../utils/logger';

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;

export const createMqttClient = (): mqtt.MqttClient => {
  const options: mqtt.IClientOptions = {
    clientId: `energix-ingest-${Date.now()}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  };

  if (MQTT_USERNAME && MQTT_PASSWORD) {
    options.username = MQTT_USERNAME;
    options.password = MQTT_PASSWORD;
  }

  const client = mqtt.connect(MQTT_BROKER_URL, options);

  client.on('connect', () => {
    logger.info('Connected to MQTT broker');
  });

  client.on('error', (err) => {
    logger.error('MQTT error:', err);
  });

  client.on('reconnect', () => {
    logger.info('Reconnecting to MQTT broker...');
  });

  client.on('offline', () => {
    logger.warn('MQTT client went offline');
  });

  return client;
};
