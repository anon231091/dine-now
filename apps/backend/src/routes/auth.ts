import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { validate, parse } from '@telegram-apps/init-data-node';
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
 * /api/auth/:
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
  '/',
  validateBody(z.object({
    initData: z.string().min(1, 'Init data is required'),
    restaurantId: schemas.Id,
  })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { initData, restaurantId } = req.body;

    logInfo('Staff authentication attempt via init data', { restaurantId });

    try {
      // Validate the init data
      validate(initData, config.telegramBotToken, {
        expiresIn: 3600, // 1 hour
      });

      // Parse the validated init data
      const parsedData = parse(initData);
      
      if (!parsedData.user) {
        logWarning('No user data in init data for staff');
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Invalid user data',
        });
      }

      const telegramUser = parsedData.user;
      const telegramId = BigInt(telegramUser.id);

      // Verify staff exists and is active
      const staffData = await queries.staff.getStaffByTelegramId(telegramId, restaurantId);

      if (!staffData || !staffData.staff.isActive) {
        logWarning('Staff authentication failed - not found or inactive', { 
          telegramId: telegramUser.id, 
          restaurantId 
        });
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Staff not found or inactive',
        });
      }

      // Generate JWT token with staff role
      const token = jwt.sign(
        { 
          staffId: staffData.staff.id,
          telegramId: telegramUser.id,
          restaurantId: staffData.staff.restaurantId,
          role: staffData.staff.role,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      logInfo('Staff authenticated successfully', { 
        staffId: staffData.staff.id,
        telegramId: telegramUser.id,
        role: staffData.staff.role,
        restaurantId: staffData.staff.restaurantId
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          token,
          user: {
            id: staffData.staff.id,
            telegramId: telegramUser.id,
            firstName: staffData.staff.firstName,
            lastName: staffData.staff.lastName,
            username: staffData.staff.username,
            role: staffData.staff.role,
            restaurantId: staffData.staff.restaurantId,
          },
          restaurant: {
            id: staffData.restaurant.id,
            name: staffData.restaurant.name,
          },
          expiresIn: config.jwtExpiresIn,
        },
      });

    } catch (error) {
      logWarning('Staff init data validation failed', { 
        error: (error as Error).message,
        restaurantId 
      });
      
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid authentication data',
      });
    }
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

      // For staff, verify they still exist and are active
      const staffData = await queries.staff.getStaffByTelegramId(BigInt(decoded.telegramId));
      if (staffData && staffData.staff.isActive) {
        userData = {
          id: staffData.staff.id,
          telegramId: decoded.telegramId,
          firstName: staffData.staff.firstName,
          lastName: staffData.staff.lastName,
          username: staffData.staff.username,
          role: staffData.staff.role,
          restaurantId: staffData.staff.restaurantId,
          restaurant: {
            id: staffData.restaurant.id,
            name: staffData.restaurant.name,
          },
        };
      }

      if (!userData) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'User not found or inactive',
        });
      }

      logInfo('Token verified successfully', { 
        telegramId: userData.telegramId, 
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

export default router;
