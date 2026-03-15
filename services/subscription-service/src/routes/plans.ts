import { Router, Request, Response } from 'express';
import Plan from '../models/Plan';
import logger from '../utils/logger';
import { authenticate, requireRole } from '../middleware/auth';
import { ApiResponse } from '@energix/shared-types';

const router = Router();

// GET /plans - List all active plans
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const filter: any = { isActive: true };
    if (type) filter.type = type;

    const plans = await Plan.find(filter).sort({ basePrice: 1 });

    const response: ApiResponse<typeof plans> = {
      success: true,
      data: plans,
    };
    res.json(response);
  } catch (error) {
    logger.error('List plans error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /plans/:id - Get plan by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found' } });
    }
    const response: ApiResponse<typeof plan> = { success: true, data: plan };
    res.json(response);
  } catch (error) {
    logger.error('Get plan error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /plans - Create plan (admin only)
router.post('/', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const plan = new Plan(req.body);
    await plan.save();
    const response: ApiResponse<typeof plan> = { success: true, data: plan };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Create plan error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// PUT /plans/:id - Update plan (admin only)
router.put('/:id', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) {
      return res.status(404).json({ success: false, error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found' } });
    }
    const response: ApiResponse<typeof plan> = { success: true, data: plan };
    res.json(response);
  } catch (error) {
    logger.error('Update plan error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// DELETE /plans/:id - Deactivate plan (admin only)
router.delete('/:id', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!plan) {
      return res.status(404).json({ success: false, error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found' } });
    }
    const response: ApiResponse<null> = { success: true, data: null };
    res.json(response);
  } catch (error) {
    logger.error('Deactivate plan error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
