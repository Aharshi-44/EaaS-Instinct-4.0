import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { register } from '../utils/metrics';
import { HealthStatus } from '@energix/shared-types';

const router = Router();

// GET /health - Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  const checks: HealthStatus['checks'] = [];

  // Check MongoDB connection
  const dbStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
  checks.push({
    name: 'mongodb',
    status: dbStatus,
    responseTime: 0,
    message: dbStatus === 'up' ? 'Connected' : 'Disconnected',
  });

  const overallStatus: HealthStatus['status'] = checks.every((c) => c.status === 'up') ? 'healthy' : 'unhealthy';

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// GET /health/ready - Readiness probe
router.get('/ready', (req: Request, res: Response) => {
  const isReady = mongoose.connection.readyState === 1;
  res.status(isReady ? 200 : 503).json({
    ready: isReady,
  });
});

// GET /health/live - Liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

// GET /metrics - Prometheus metrics
router.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
