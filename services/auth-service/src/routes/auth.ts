import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { verifyGoogleToken } from '../services/googleAuth';
import logger from '../utils/logger';
import { authLoginTotal, authSignupTotal } from '../utils/metrics';
import { ApiResponse, AuthTokens } from '@energix/shared-types';

const router = Router();

// Validation middleware
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

// POST /auth/signup - Email/Password registration
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        authSignupTotal.inc({ provider: 'local', status: 'failed' });
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
          },
        });
      }

      // Create new user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        phone,
        authProvider: 'local',
        role: 'user',
      });

      await user.save();

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        authProvider: 'local',
      });

      // Save refresh token
      await user.addRefreshToken(tokens.refreshToken);

      authSignupTotal.inc({ provider: 'local', status: 'success' });

      const response: ApiResponse<{
        user: Partial<typeof user>;
        tokens: AuthTokens;
      }> = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            authProvider: user.authProvider,
            emailVerified: user.emailVerified,
          },
          tokens,
        },
      };

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json(response);
    } catch (error) {
      logger.error('Signup error:', error);
      authSignupTotal.inc({ provider: 'local', status: 'error' });
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

// POST /auth/login - Email/Password login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email, isActive: true });
      if (!user || user.authProvider !== 'local') {
        authLoginTotal.inc({ provider: 'local', status: 'failed' });
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        authLoginTotal.inc({ provider: 'local', status: 'failed' });
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        });
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        authProvider: 'local',
      });

      // Save refresh token
      await user.addRefreshToken(tokens.refreshToken);

      authLoginTotal.inc({ provider: 'local', status: 'success' });

      const response: ApiResponse<{
        user: Partial<typeof user>;
        tokens: AuthTokens;
      }> = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            authProvider: user.authProvider,
            emailVerified: user.emailVerified,
          },
          tokens,
        },
      };

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json(response);
    } catch (error) {
      logger.error('Login error:', error);
      authLoginTotal.inc({ provider: 'local', status: 'error' });
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

// POST /auth/google - Google Sign-In
router.post(
  '/google',
  [body('idToken').notEmpty().withMessage('Google ID token is required'), handleValidationErrors],
  async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;

      // Verify Google token
      const googleUserInfo = await verifyGoogleToken(idToken);

      // Find or create user
      let user = await User.findOne({ email: googleUserInfo.email });

      if (user) {
        // Existing user - update Google info if needed
        if (user.authProvider !== 'google') {
          // Link Google account to existing local account
          user.googleId = googleUserInfo.googleId;
          user.authProvider = 'google';
          user.emailVerified = googleUserInfo.emailVerified || user.emailVerified;
        }
      } else {
        // Create new user
        user = new User({
          email: googleUserInfo.email,
          firstName: googleUserInfo.firstName,
          lastName: googleUserInfo.lastName,
          googleId: googleUserInfo.googleId,
          authProvider: 'google',
          role: 'user',
          emailVerified: googleUserInfo.emailVerified,
        });
        authSignupTotal.inc({ provider: 'google', status: 'success' });
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        authProvider: 'google',
      });

      // Save refresh token
      await user.addRefreshToken(tokens.refreshToken);

      authLoginTotal.inc({ provider: 'google', status: 'success' });

      const response: ApiResponse<{
        user: Partial<typeof user>;
        tokens: AuthTokens;
      }> = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            authProvider: user.authProvider,
            emailVerified: user.emailVerified,
          },
          tokens,
        },
      };

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json(response);
    } catch (error) {
      logger.error('Google auth error:', error);
      authLoginTotal.inc({ provider: 'google', status: 'error' });
      res.status(401).json({
        success: false,
        error: {
          code: 'GOOGLE_AUTH_FAILED',
          message: 'Google authentication failed',
        },
      });
    }
  }
);

// POST /auth/refresh - Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token is required',
        },
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      });
    }

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.hasRefreshToken(refreshToken)) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is not valid',
        },
      });
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider,
    });

    // Remove old refresh token and add new one
    await user.removeRefreshToken(refreshToken);
    await user.addRefreshToken(tokens.refreshToken);

    const response: ApiResponse<AuthTokens> = {
      success: true,
      data: tokens,
    };

    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json(response);
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

// POST /auth/logout - Logout user
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.userId);
        if (user) {
          await user.removeRefreshToken(refreshToken);
        }
      } catch {
        // Token is invalid, just clear the cookie
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };

    res.json(response);
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

// POST /auth/logout-all - Logout from all devices
router.post('/logout-all', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.userId);
        if (user) {
          // Clear all refresh tokens
          user.refreshTokens = [];
          await user.save();
        }
      } catch {
        // Token is invalid
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };

    res.json(response);
  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

export default router;
