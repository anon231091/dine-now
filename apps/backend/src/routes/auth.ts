import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { queries } from '@dine-now/database';
import { schemas, HTTP_STATUS } from '@dine-now/shared';
import { 
  asyncHandler, 
  validateBody,
  AuthenticatedRequest 
} from '../middleware';
import config from '../config';
import { logInfo, logWarning } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/auth/telegram:
 *   post:
 *     summary: Authenticate customer via Telegram Mini App init data
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               initData:
 *                 type: string
 *                 description: Raw init data string from Telegram Mini App
 *             required:
 *               - initData
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid init data
 *       401:
 *         description: Authentication failed
 */
router.post(
  '/telegram',
  validateBody(z.object({
    initData: z.string().min(1, 'Init data is required'),
  })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { initData } = req.body;

    logInfo('Telegram authentication attempt via init data');

    // Validate the init data
    const validation = validateTelegramInitData(initData);
    
    if (!validation.isValid || !validation.data?.user) {
      logWarning('Invalid Telegram init data');
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid authentication data',
      });
    }

    const { user: telegramUser } = validation.data;

    // Get or create customer
    const customer = await queries.customer.getOrCreateCustomer({
      telegramId: telegramUser.id.toString(),
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      username: telegramUser.username,
    });

    if (!customer) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Failed to create or retrieve customer',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: customer.id,
        telegramId: customer.telegramId,
        type: 'customer'
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    logInfo('Customer authenticated successfully', { 
      customerId: customer.id,
      telegramId: customer.telegramId 
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        token,
        user: {
          id: customer.id,
          telegramId: customer.telegramId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          username: customer.username,
          type: 'customer',
        },
        expiresIn: config.jwtExpiresIn,
      },
    });
  })
);

/**
 * @swagger
 * /api/auth/staff:
 *   post:
 *     summary: Authenticate staff member via Telegram init data
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               initData:
 *                 type: string
 *                 description: Raw init data string from Telegram Mini App
 *               restaurantId:
 *                 type: string
 *                 description: Restaurant ID for staff validation
 *             required:
 *               - initData
 *               - restaurantId
 *     responses:
 *       200:
 *         description: Staff authentication successful
 *       401:
 *         description: Staff not found or unauthorized
 */
router.post(
  '/staff',
  validateBody(z.object({
    initData: z.string().min(1, 'Init data is required'),
    restaurantId: schemas.Id,
  })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { initData, restaurantId } = req.body;

    logInfo('Staff authentication attempt via init data', { restaurantId });

    // Validate the init data
    const validation = validateTelegramInitData(initData);
    
    if (!validation.isValid || !validation.data?.user) {
      logWarning('Invalid Telegram init data for staff');
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid authentication data',
      });
    }

    const { user: telegramUser } = validation.data;
    const telegramId = telegramUser.id.toString();

    // Verify staff exists and is active
    const staffData = await queries.staff.getStaffByTelegramId(telegramId, restaurantId);

    if (!staffData || !staffData.staff.isActive) {
      logWarning('Staff authentication failed - not found or inactive', { 
        telegramId, 
        restaurantId 
      });
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Staff not found or inactive',
      });
    }

    // Update staff info if changed
    if (staffData.staff.firstName !== telegramUser.first_name ||
        staffData.staff.lastName !== telegramUser.last_name ||
        staffData.staff.username !== telegramUser.username) {
      // You might want to update staff info here
      logInfo('Staff info changed in Telegram', {
        staffId: staffData.staff.id,
        changes: {
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          username: telegramUser.username,
        }
      });
    }

    // Generate JWT token with staff role
    const token = jwt.sign(
      { 
        staffId: staffData.staff.id,
        telegramId: staffData.staff.telegramId,
        restaurantId: staffData.staff.restaurantId,
        role: staffData.staff.role,
        type: 'staff'
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    logInfo('Staff authenticated successfully', { 
      staffId: staffData.staff.id,
      telegramId: staffData.staff.telegramId,
      role: staffData.staff.role,
      restaurantId: staffData.staff.restaurantId
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        token,
        user: {
          id: staffData.staff.id,
          telegramId: staffData.staff.telegramId,
          firstName: staffData.staff.firstName,
          lastName: staffData.staff.lastName,
          username: staffData.staff.username,
          role: staffData.staff.role,
          restaurantId: staffData.staff.restaurantId,
          type: 'staff',
        },
        restaurant: {
          id: staffData.restaurant.id,
          name: staffData.restaurant.name,
        },
        expiresIn: config.jwtExpiresIn,
      },
    });
  })
);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify JWT token and get user info
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid or expired token
 */
router.get(
  '/verify',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'No token provided',
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      
      let userData = null;
      
      if (decoded.type === 'customer' && decoded.userId) {
        const customer = await queries.customer.getCustomerById(decoded.userId);
        if (customer) {
          userData = {
            id: customer.id,
            telegramId: customer.telegramId,
            firstName: customer.firstName,
            lastName: customer.lastName,
            username: customer.username,
            type: 'customer',
          };
        }
      } else if (decoded.type === 'staff' && decoded.telegramId) {
        const staffData = await queries.staff.getStaffByTelegramId(decoded.telegramId);
        if (staffData && staffData.staff.isActive) {
          userData = {
            id: staffData.staff.id,
            telegramId: staffData.staff.telegramId,
            firstName: staffData.staff.firstName,
            lastName: staffData.staff.lastName,
            username: staffData.staff.username,
            role: staffData.staff.role,
            restaurantId: staffData.staff.restaurantId,
            type: 'staff',
            restaurant: {
              id: staffData.restaurant.id,
              name: staffData.restaurant.name,
            },
          };
        }
      }

      if (!userData) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not found or inactive',
        });
      }

      logInfo('Token verified successfully', { 
        userId: userData.id, 
        type: userData.type 
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          user: userData,
          token,
          expiresAt: new Date(decoded.exp * 1000),
        },
      });

    } catch (error) {
      logWarning('Token verification failed', { error: (error as Error).message });
      
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  })
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'No token provided',
      });
    }

    try {
      // Verify the current token (even if expired)
      const decoded = jwt.verify(token, config.jwtSecret, { ignoreExpiration: true }) as any;
      
      // Check if token is too old to refresh (e.g., more than 30 days old)
      const tokenAge = Date.now() / 1000 - decoded.iat;
      const maxRefreshAge = 30 * 24 * 60 * 60; // 30 days
      
      if (tokenAge > maxRefreshAge) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Token too old to refresh',
        });
      }

      // Generate new token with same payload
      const newToken = jwt.sign(
        { 
          ...decoded,
          iat: undefined, // Remove old issued at
          exp: undefined, // Remove old expiry
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      logInfo('Token refreshed successfully', { 
        userId: decoded.userId || decoded.staffId, 
        type: decoded.type 
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          token: newToken,
          expiresIn: config.jwtExpiresIn,
        },
      });

    } catch (error) {
      logWarning('Token refresh failed', { error: (error as Error).message });
      
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid token',
      });
    }
  })
);

export default router;
