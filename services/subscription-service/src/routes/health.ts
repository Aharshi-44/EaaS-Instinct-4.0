import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import client from 'prom-client';
const router = Router();
const register = new client.Registry();
client.collectDefaultMetrics({ register });

router.get('/', async (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
  const health = {
    status: dbStatus === 'up' ? 'healthy' : 'unhealthy',
    timestamp: new Date(),
    version: '1.0.0',
    checks: [{ name: 'mongodb', status: dbStatus, message: dbStatus === 'up' ? 'Connected' : 'Disconnected' }],
  };
  res.status(dbStatus === 'up' ? 200 : 503).json(health);
});

router.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
