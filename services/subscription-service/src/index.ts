import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './utils/logger';
import planRoutes from './routes/plans';
import subscriptionRoutes from './routes/subscriptions';
import deviceRoutes from './routes/devices';
import healthRoutes from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/energix_subscriptions';

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use('/plans', planRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/devices', deviceRoutes);
app.use('/health', healthRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ service: 'subscription-service', version: '1.0.0', status: 'running', timestamp: new Date().toISOString() });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');
    await seedPlans();
    app.listen(PORT, () => logger.info(`Subscription service running on port ${PORT}`));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Seed default plans
async function seedPlans() {
  const Plan = mongoose.model('Plan');
  const count = await Plan.countDocuments();
  if (count === 0) {
    const plans = [
      {
        name: 'Residential Basic',
        description: 'Perfect for small homes with basic energy needs',
        type: 'residential',
        basePrice: 99,
        unitPrice: 8.5,
        features: ['Real-time monitoring', 'Mobile app access', 'Monthly reports', 'Email support'],
        maxDevices: 3,
      },
      {
        name: 'Residential Pro',
        description: 'Advanced monitoring for modern homes with solar',
        type: 'residential',
        basePrice: 199,
        unitPrice: 7.5,
        features: ['Real-time monitoring', 'Mobile app access', 'Weekly reports', 'Priority support', 'Solar integration', 'Battery monitoring'],
        maxDevices: 10,
      },
      {
        name: 'Commercial',
        description: 'Business-grade energy management solution',
        type: 'commercial',
        basePrice: 999,
        unitPrice: 6.5,
        features: ['Real-time monitoring', 'Multi-location dashboard', 'Daily reports', '24/7 support', 'API access', 'Custom alerts'],
        maxDevices: 50,
      },
    ];
    await Plan.insertMany(plans);
    logger.info('Default plans seeded');
  }
}

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
