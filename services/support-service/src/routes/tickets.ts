import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Ticket from '../models/Ticket';
import Comment from '../models/Comment';
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

// Generate ticket number
const generateTicketNumber = () => {
  const date = new Date();
  return `TKT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;
};

// POST /tickets - Create a new ticket
router.post(
  '/',
  authenticate,
  [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').isIn(['billing', 'technical', 'account', 'general']).withMessage('Valid category is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const { subject, description, category, priority = 'medium' } = req.body;

      // Calculate SLA deadline based on priority
      const slaHours = { low: 72, medium: 48, high: 24, urgent: 4 };
      const slaDeadline = new Date();
      slaDeadline.setHours(slaDeadline.getHours() + slaHours[priority as keyof typeof slaHours]);

      const ticket = new Ticket({
        ticketNumber: generateTicketNumber(),
        userId: req.user!.userId,
        subject,
        description,
        category,
        priority,
        status: 'open',
        slaDeadline,
      });

      await ticket.save();

      const response: ApiResponse<typeof ticket> = { success: true, data: ticket };
      res.status(201).json(response);
    } catch (error) {
      logger.error('Create ticket error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    }
  }
);

// GET /tickets/my - Get current user's tickets
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: any = { userId: req.user!.userId };
    if (req.query.status) filter.status = req.query.status;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Ticket.countDocuments(filter),
    ]);

    const response: ApiResponse<typeof tickets> = {
      success: true,
      data: tickets,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    res.json(response);
  } catch (error) {
    logger.error('List tickets error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /tickets/:id - Get ticket by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!ticket) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    // Get comments
    const comments = await Comment.find({ ticketId: req.params.id, isInternal: false }).sort({ createdAt: 1 });

    const response: ApiResponse<{ ticket: typeof ticket; comments: typeof comments }> = {
      success: true,
      data: { ticket, comments },
    };
    res.json(response);
  } catch (error) {
    logger.error('Get ticket error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /tickets/:id/comments - Add comment to ticket
router.post(
  '/:id/comments',
  authenticate,
  [body('content').trim().notEmpty(), handleValidationErrors],
  async (req: Request, res: Response) => {
    try {
      const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user!.userId });
      if (!ticket) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }

      const comment = new Comment({
        ticketId: req.params.id,
        userId: req.user!.userId,
        content: req.body.content,
        isInternal: false,
      });

      await comment.save();

      // Update ticket status if waiting for customer
      if (ticket.status === 'waiting_customer') {
        ticket.status = 'in_progress';
        await ticket.save();
      }

      const response: ApiResponse<typeof comment> = { success: true, data: comment };
      res.status(201).json(response);
    } catch (error) {
      logger.error('Add comment error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    }
  }
);

// DELETE /tickets/:id - Delete current user's ticket (and its comments)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!ticket) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    await Promise.all([
      Comment.deleteMany({ ticketId: req.params.id }),
      Ticket.deleteOne({ _id: req.params.id, userId: req.user!.userId }),
    ]);

    const response: ApiResponse<{ deleted: true }> = { success: true, data: { deleted: true } };
    res.json(response);
  } catch (error) {
    logger.error('Delete ticket error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /tickets - List all tickets (admin only)
router.get('/', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Ticket.countDocuments(filter),
    ]);

    const response: ApiResponse<typeof tickets> = {
      success: true,
      data: tickets,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    res.json(response);
  } catch (error) {
    logger.error('List all tickets error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// PUT /tickets/:id/assign - Assign ticket (admin only)
router.put('/:id/assign', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { assignedTo } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: 'in_progress' },
      { new: true }
    );
    if (!ticket) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }
    const response: ApiResponse<typeof ticket> = { success: true, data: ticket };
    res.json(response);
  } catch (error) {
    logger.error('Assign ticket error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// PUT /tickets/:id/status - Update ticket status (admin only)
router.put('/:id/status', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const update: any = { status };

    if (status === 'resolved') update.resolvedAt = new Date();
    if (status === 'closed') update.closedAt = new Date();

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!ticket) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }
    const response: ApiResponse<typeof ticket> = { success: true, data: ticket };
    res.json(response);
  } catch (error) {
    logger.error('Update ticket status error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
