import { Router, Request, Response } from 'express';
import Device from '../models/Device';
import Subscription from '../models/Subscription';
import Plan from '../models/Plan';
import logger from '../utils/logger';
import { authenticate, requireRole } from '../middleware/auth';
import { ApiResponse } from '@energix/shared-types';

const router = Router();

// GET /devices - List user's devices
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const devices = await Device.find({ userId: req.user!.userId });
    const response: ApiResponse<typeof devices> = { success: true, data: devices };
    res.json(response);
  } catch (error) {
    logger.error('List devices error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /devices - Register a new device
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, type, serialNumber, manufacturer, model, location } = req.body;

    // Check user's subscription and device limit
    const subscription = await Subscription.findOne({
      userId: req.user!.userId,
      status: 'active',
    }).populate('planId');

    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: 'No active subscription found' },
      });
    }

    const plan = subscription.planId as any;
    const deviceCount = await Device.countDocuments({ userId: req.user!.userId });

    if (deviceCount >= plan.maxDevices) {
      return res.status(403).json({
        success: false,
        error: { code: 'DEVICE_LIMIT_REACHED', message: `Maximum ${plan.maxDevices} devices allowed` },
      });
    }

    // Check for duplicate serial number
    const existingDevice = await Device.findOne({ serialNumber });
    if (existingDevice) {
      return res.status(409).json({
        success: false,
        error: { code: 'DEVICE_EXISTS', message: 'Device with this serial number already exists' },
      });
    }

    const device = new Device({
      userId: req.user!.userId,
      subscriptionId: subscription._id,
      name,
      type,
      serialNumber,
      manufacturer,
      model,
      location,
      status: 'offline',
    });

    await device.save();
    const response: ApiResponse<typeof device> = { success: true, data: device };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Create device error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /devices/:id - Get device by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!device) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } });
    }
    const response: ApiResponse<typeof device> = { success: true, data: device };
    res.json(response);
  } catch (error) {
    logger.error('Get device error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// PUT /devices/:id - Update device
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      req.body,
      { new: true }
    );
    if (!device) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } });
    }
    const response: ApiResponse<typeof device> = { success: true, data: device };
    res.json(response);
  } catch (error) {
    logger.error('Update device error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// DELETE /devices/:id - Delete device
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const device = await Device.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
    if (!device) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } });
    }
    const response: ApiResponse<null> = { success: true, data: null };
    res.json(response);
  } catch (error) {
    logger.error('Delete device error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// PUT /devices/:id/status - Update device status (internal use)
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, lastSeenAt } = req.body;
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { status, lastSeenAt: lastSeenAt || new Date() },
      { new: true }
    );
    if (!device) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } });
    }
    const response: ApiResponse<typeof device> = { success: true, data: device };
    res.json(response);
  } catch (error) {
    logger.error('Update device status error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
