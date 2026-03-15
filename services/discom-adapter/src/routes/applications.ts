import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import DiscomApplication from '../models/DiscomApplication';
import { submitApplication, checkApplicationStatus } from '../services/discomSimulator';
import logger from '../utils/logger';
import { authenticate, requireRole } from '../middleware/auth';
import { ApiResponse } from '@energix/shared-types';

const router = Router();

const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
  }
  next();
};

// POST /discom/applications - Submit new DISCOM application
router.post(
  '/',
  authenticate,
  [
    body('discomId').trim().notEmpty(),
    body('subscriptionId').trim().notEmpty(),
    body('applicationType').isIn(['new_connection', 'load_enhancement', 'category_change', 'net_metering']),
    body('applicationData').isObject(),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const { discomId, subscriptionId, applicationType, applicationData } = req.body;

      // Submit to DISCOM simulator
      const discomResponse = await submitApplication({
        consumerNumber: applicationData.consumerNumber,
        applicationType,
        loadRequested: applicationData.loadRequested,
        address: applicationData.address,
        documents: applicationData.documents || [],
      });

      if (!discomResponse.success) {
        return res.status(502).json({
          success: false,
          error: { code: 'DISCOM_ERROR', message: discomResponse.error || 'DISCOM submission failed' },
        });
      }

      // Save application locally
      const application = new DiscomApplication({
        userId: req.user!.userId,
        subscriptionId,
        discomId,
        applicationType,
        applicationData,
        discomReference: discomResponse.referenceNumber,
        status: discomResponse.status || 'pending',
        submittedAt: new Date(),
      });

      await application.save();

      const response: ApiResponse<typeof application> = { success: true, data: application };
      res.status(201).json(response);
    } catch (error) {
      logger.error('Submit DISCOM application error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    }
  }
);

// GET /discom/applications/my - Get user's applications
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    const applications = await DiscomApplication.find({ userId: req.user!.userId }).sort({ createdAt: -1 });
    const response: ApiResponse<typeof applications> = { success: true, data: applications };
    res.json(response);
  } catch (error) {
    logger.error('List DISCOM applications error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /discom/applications/:id - Get application by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const application = await DiscomApplication.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!application) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }

    // Check latest status from DISCOM
    if (application.discomReference && application.status === 'pending') {
      try {
        const statusResponse = await checkApplicationStatus(application.discomReference);
        if (statusResponse.success && statusResponse.status) {
          application.status = statusResponse.status as any;
          if (statusResponse.status !== 'pending') {
            application.processedAt = new Date();
          }
          await application.save();
        }
      } catch (e) {
        logger.warn('Failed to check DISCOM status:', e);
      }
    }

    const response: ApiResponse<typeof application> = { success: true, data: application };
    res.json(response);
  } catch (error) {
    logger.error('Get DISCOM application error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /discom/applications - List all applications (admin only)
router.get('/', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;

    const [applications, total] = await Promise.all([
      DiscomApplication.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      DiscomApplication.countDocuments(filter),
    ]);

    const response: ApiResponse<typeof applications> = {
      success: true,
      data: applications,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    res.json(response);
  } catch (error) {
    logger.error('List all DISCOM applications error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
