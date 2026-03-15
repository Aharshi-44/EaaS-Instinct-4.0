import mqtt from 'mqtt';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })],
});

// Configuration
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const DEVICE_ID = process.env.DEVICE_ID || 'sim-device-001';
const USER_ID = process.env.USER_ID || 'test-user-001';
const PUBLISH_INTERVAL = parseInt(process.env.PUBLISH_INTERVAL_MS || '5000');
const SIMULATE_SOLAR = process.env.SIMULATE_SOLAR === 'true';
const SIMULATE_BATTERY = process.env.SIMULATE_BATTERY === 'true';
const GRID_VOLTAGE = parseFloat(process.env.GRID_VOLTAGE || '230');
const BASE_LOAD_W = parseFloat(process.env.BASE_LOAD_W || '500');
const SOLAR_CAPACITY_KW = parseFloat(process.env.SOLAR_CAPACITY_KW || '5');
const BATTERY_CAPACITY_KWH = parseFloat(process.env.BATTERY_CAPACITY_KWH || '10');

// Device state
interface DeviceState {
  gridPower: number;
  solarPower: number;
  batteryLevel: number;
  batteryPower: number;
  loadPower: number;
  totalEnergy: number;
  solarEnergy: number;
  batteryEnergy: number;
}

const state: DeviceState = {
  gridPower: 0,
  solarPower: 0,
  batteryLevel: 50, // percentage
  batteryPower: 0,
  loadPower: BASE_LOAD_W,
  totalEnergy: 0,
  solarEnergy: 0,
  batteryEnergy: 0,
};

// Simulate solar generation based on time of day
function simulateSolarPower(): number {
  const hour = new Date().getHours();
  // Peak solar at noon (12 PM), zero at night
  const solarFactor = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  return Math.round(SOLAR_CAPACITY_KW * 1000 * solarFactor * (0.8 + Math.random() * 0.4));
}

// Simulate load variation
function simulateLoad(): number {
  return Math.round(BASE_LOAD_W * (0.8 + Math.random() * 0.4));
}

// Update device state
function updateState(): void {
  // Simulate solar
  state.solarPower = SIMULATE_SOLAR ? simulateSolarPower() : 0;

  // Simulate load
  state.loadPower = simulateLoad();

  // Calculate power balance
  const surplus = state.solarPower - state.loadPower;

  if (SIMULATE_BATTERY) {
    if (surplus > 0) {
      // Charging battery
      const maxChargePower = (BATTERY_CAPACITY_KWH * 1000) / 4; // 4 hour charge rate
      state.batteryPower = -Math.min(surplus, maxChargePower);
      state.gridPower = 0;
    } else {
      // Discharging battery
      const dischargeNeeded = -surplus;
      const maxDischargePower = (BATTERY_CAPACITY_KWH * 1000) / 2; // 2 hour discharge rate
      const batteryDischarge = Math.min(dischargeNeeded, maxDischargePower, (state.batteryLevel / 100) * BATTERY_CAPACITY_KWH * 1000);
      state.batteryPower = batteryDischarge;
      state.gridPower = dischargeNeeded - batteryDischarge;
    }

    // Update battery level
    const energyDelta = (-state.batteryPower * PUBLISH_INTERVAL) / (1000 * 3600); // kWh
    state.batteryLevel = Math.max(0, Math.min(100, state.batteryLevel + (energyDelta / BATTERY_CAPACITY_KWH) * 100));
  } else {
    state.batteryPower = 0;
    state.gridPower = Math.max(0, -surplus);
  }

  // Update energy counters
  state.totalEnergy += (state.gridPower * PUBLISH_INTERVAL) / (1000 * 3600 * 1000); // MWh
  state.solarEnergy += (state.solarPower * PUBLISH_INTERVAL) / (1000 * 3600 * 1000);
  state.batteryEnergy += (Math.abs(state.batteryPower) * PUBLISH_INTERVAL) / (1000 * 3600 * 1000);
}

// Create telemetry payload
function createTelemetry(source: 'grid' | 'solar' | 'battery' | 'load'): any {
  const basePayload = {
    deviceId: DEVICE_ID,
    userId: USER_ID,
    timestamp: new Date().toISOString(),
    source,
    quality: 'good',
  };

  switch (source) {
    case 'grid':
      return {
        ...basePayload,
        metrics: {
          voltage: GRID_VOLTAGE + (Math.random() - 0.5) * 10,
          current: state.gridPower / GRID_VOLTAGE,
          power: state.gridPower,
          energy: state.totalEnergy,
          frequency: 50 + (Math.random() - 0.5) * 0.5,
          powerFactor: 0.95 + Math.random() * 0.05,
        },
      };
    case 'solar':
      return {
        ...basePayload,
        metrics: {
          voltage: 400 + (Math.random() - 0.5) * 20,
          current: state.solarPower / 400,
          power: state.solarPower,
          energy: state.solarEnergy,
          temperature: 45 + Math.random() * 15,
        },
      };
    case 'battery':
      return {
        ...basePayload,
        metrics: {
          voltage: 48 + (Math.random() - 0.5) * 2,
          current: state.batteryPower / 48,
          power: state.batteryPower,
          energy: state.batteryEnergy,
          temperature: 30 + Math.random() * 5,
        },
        batteryLevel: state.batteryLevel,
        charging: state.batteryPower < 0,
      };
    case 'load':
      return {
        ...basePayload,
        metrics: {
          voltage: GRID_VOLTAGE,
          current: state.loadPower / GRID_VOLTAGE,
          power: state.loadPower,
          energy: state.totalEnergy,
        },
      };
  }
}

// Main function
async function main() {
  logger.info('Starting device simulator...');
  logger.info(`Device ID: ${DEVICE_ID}`);
  logger.info(`User ID: ${USER_ID}`);
  logger.info(`MQTT Broker: ${MQTT_BROKER_URL}`);

  // Connect to MQTT
  const client = mqtt.connect(MQTT_BROKER_URL, {
    clientId: `simulator-${DEVICE_ID}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  });

  client.on('connect', () => {
    logger.info('Connected to MQTT broker');

    // Publish telemetry periodically
    setInterval(() => {
      updateState();

      // Publish grid telemetry
      const gridTelemetry = createTelemetry('grid');
      client.publish(`energix/devices/${DEVICE_ID}/telemetry`, JSON.stringify(gridTelemetry));
      logger.debug(`Published grid telemetry: ${gridTelemetry.metrics.power}W`);

      // Publish solar telemetry
      if (SIMULATE_SOLAR) {
        const solarTelemetry = createTelemetry('solar');
        client.publish(`energix/devices/${DEVICE_ID}/telemetry`, JSON.stringify(solarTelemetry));
        logger.debug(`Published solar telemetry: ${solarTelemetry.metrics.power}W`);
      }

      // Publish battery telemetry
      if (SIMULATE_BATTERY) {
        const batteryTelemetry = createTelemetry('battery');
        client.publish(`energix/devices/${DEVICE_ID}/telemetry`, JSON.stringify(batteryTelemetry));
        logger.debug(`Published battery telemetry: ${batteryTelemetry.metrics.power}W, level: ${batteryTelemetry.batteryLevel}%`);
      }

      // Publish load telemetry
      const loadTelemetry = createTelemetry('load');
      client.publish(`energix/devices/${DEVICE_ID}/telemetry`, JSON.stringify(loadTelemetry));
      logger.debug(`Published load telemetry: ${loadTelemetry.metrics.power}W`);

      // Publish status
      client.publish(
        `energix/devices/${DEVICE_ID}/status`,
        JSON.stringify({
          deviceId: DEVICE_ID,
          status: 'online',
          timestamp: new Date().toISOString(),
          batteryLevel: state.batteryLevel,
        })
      );
    }, PUBLISH_INTERVAL);
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

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down...');
    client.end();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down...');
    client.end();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
