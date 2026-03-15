import { Router, Request, Response } from 'express';
import Subscription from '../models/Subscription';
import Plan from '../models/Plan';
import Device from '../models/Device';
import logger from '../utils/logger';
import { authenticate, requireRole } from '../middleware/auth';
import { ApiResponse } from '@energix/shared-types';

const router = Router();

// GET /subscriptions/my - Get current user's subscription
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user!.userId,
      status: { $in: ['active', 'pending'] },
    }).populate('planId');

    const response: ApiResponse<typeof subscription> = {
      success: true,
      data: subscription,
    };
    res.json(response);
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /subscriptions - Subscribe to a plan
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { planId, startDate } = req.body;

    // Check if user already has active subscription
    const existingSub = await Subscription.findOne({
      userId: req.user!.userId,
      status: { $in: ['active', 'pending'] },
    });

    if (existingSub) {
      return res.status(409).json({
        success: false,
        error: { code: 'ACTIVE_SUBSCRIPTION_EXISTS', message: 'User already has an active subscription' },
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found' } });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const subscription = new Subscription({
      userId: req.user!.userId,
      planId,
      status: 'active',
      startDate: start,
      endDate: end,
      autoRenew: true,
      currentPeriodStart: start,
      currentPeriodEnd: end,
    });

    await subscription.save();
    await subscription.populate('planId');

    const response: ApiResponse<typeof subscription> = { success: true, data: subscription };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Create subscription error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// PUT /subscriptions/:id/cancel - Cancel subscription
router.put('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user!.userId,
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subscription not found' } });
    }

    subscription.status = 'cancelled';
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    const response: ApiResponse<typeof subscription> = { success: true, data: subscription };
    res.json(response);
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /subscriptions - List all subscriptions (admin only)
router.get('/', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.userId) filter.userId = req.query.userId;

    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter).populate('planId').skip(skip).limit(limit).sort({ createdAt: -1 }),
      Subscription.countDocuments(filter),
    ]);

    const response: ApiResponse<typeof subscriptions> = {
      success: true,
      data: subscriptions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    res.json(response);
  } catch (error) {
    logger.error('List subscriptions error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
