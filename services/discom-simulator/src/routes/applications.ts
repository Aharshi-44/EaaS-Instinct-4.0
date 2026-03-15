import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

const router = Router();

// In-memory store for applications
const applications = new Map();

const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
  }
  next();
};

// Simulate processing delay and random outcomes
const simulateProcessing = async (): Promise<{ status: string; message?: string }> => {
  const delay = parseInt(process.env.SIMULATION_DELAY_MS || '2000');
  await new Promise((resolve) => setTimeout(resolve, delay));

  const successRate = parseFloat(process.env.SUCCESS_RATE || '0.8');
  const rejectionRate = parseFloat(process.env.REJECTION_RATE || '0.1');
  const random = Math.random();

  if (random < successRate) {
    return { status: 'approved', message: 'Application approved successfully' };
  } else if (random < successRate + rejectionRate) {
    return { status: 'rejected', message: 'Application rejected due to incomplete documentation' };
  } else {
    return { status: 'pending', message: 'Application under review' };
  }
};

// POST /api/applications - Submit new application
router.post(
  '/',
  [
    body('consumerNumber').trim().notEmpty(),
    body('applicationType').isIn(['new_connection', 'load_enhancement', 'category_change', 'net_metering']),
    body('loadRequested').isNumeric(),
    body('address').trim().notEmpty(),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const { consumerNumber, applicationType, loadRequested, address, documents } = req.body;

      logger.info(`Received DISCOM application from consumer: ${consumerNumber}`);

      // Generate reference number
      const referenceNumber = `DISCOM-${Date.now().toString(36).toUpperCase()}`;

      // Simulate processing
      const result = await simulateProcessing();

      // Store application
      const application = {
        referenceNumber,
        consumerNumber,
        applicationType,
        loadRequested,
        address,
        documents: documents || [],
        status: result.status,
        message: result.message,
        submittedAt: new Date().toISOString(),
        processedAt: result.status !== 'pending' ? new Date().toISOString() : null,
        estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      applications.set(referenceNumber, application);

      logger.info(`Application ${referenceNumber} processed with status: ${result.status}`);

      res.status(201).json({
        success: true,
        referenceNumber,
        status: result.status,
        message: result.message,
        estimatedCompletionDate: application.estimatedCompletionDate,
      });
    } catch (error) {
      logger.error('DISCOM simulator error:', error);
      res.status(500).json({ success: false, error: 'Internal simulator error' });
    }
  }
);

// GET /api/applications/:referenceNumber/status - Check application status
router.get('/:referenceNumber/status', async (req: Request, res: Response) => {
  try {
    const { referenceNumber } = req.params;
    const application = applications.get(referenceNumber);

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    // Simulate status change for pending applications
    if (application.status === 'pending') {
      const timeSinceSubmission = Date.now() - new Date(application.submittedAt).getTime();
      if (timeSinceSubmission > 10000) {
        // 10 seconds
        const result = await simulateProcessing();
        application.status = result.status;
        application.message = result.message;
        application.processedAt = new Date().toISOString();
      }
    }

    res.json({
      success: true,
      referenceNumber,
      status: application.status,
      message: application.message,
      submittedAt: application.submittedAt,
      processedAt: application.processedAt,
      estimatedCompletionDate: application.estimatedCompletionDate,
    });
  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({ success: false, error: 'Internal simulator error' });
  }
});

// GET /api/applications - List all applications (for debugging)
router.get('/', (req: Request, res: Response) => {
  const allApps = Array.from(applications.values());
  res.json({ success: true, data: allApps, count: allApps.length });
});

export default router;
