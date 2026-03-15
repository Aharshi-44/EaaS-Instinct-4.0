import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import logger from '../utils/logger';
import { authenticate, requireRole } from '../middleware/auth';
import { ApiResponse } from '@energix/shared-types';

const router = Router();

const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
    });
  }
  next();
};

// POST /users - Create or sync user (called by auth-service)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, email, firstName, lastName, phone, role, emailVerified } = req.body;

    let user = await User.findById(id);

    if (user) {
      // Update existing user
      user.email = email;
      user.firstName = firstName;
      user.lastName = lastName;
      if (phone) user.phone = phone;
      if (role) user.role = role;
      if (emailVerified !== undefined) user.emailVerified = emailVerified;
      await user.save();
    } else {
      // Create new user
      user = new User({
        _id: id,
        email,
        firstName,
        lastName,
        phone,
        role: role || 'user',
        emailVerified: emailVerified || false,
      });
      await user.save();
    }

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

// GET /users/me - Get current user profile
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
    };

    res.json(response);
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

// PUT /users/me - Update current user profile
router.put(
  '/me',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, phone, profile, preferences } = req.body;

      const user = await User.findById(req.user!.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone !== undefined) user.phone = phone;
      if (profile) user.profile = { ...user.profile, ...profile };
      if (preferences) user.preferences = { ...user.preferences, ...preferences };

      await user.save();

      const response: ApiResponse<typeof user> = {
        success: true,
        data: user,
      };

      res.json(response);
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }
);

// GET /users - List all users (admin only)
router.get('/', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    const response: ApiResponse<typeof users> = {
      success: true,
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('List users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

// GET /users/:id - Get user by ID (admin only)
router.get('/:id', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
    };

    res.json(response);
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

// DELETE /users/:id - Deactivate user (admin only)
router.delete(
  '/:id',
  authenticate,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      user.isActive = false;
      await user.save();

      const response: ApiResponse<null> = {
        success: true,
        data: null,
      };

      res.json(response);
    } catch (error) {
      logger.error('Deactivate user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }
);

export default router;
