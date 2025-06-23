import { Router, Response } from 'express';
import { queries } from '@dine-now/database';
import { schemas, HTTP_STATUS } from '@dine-now/shared';
import { 
  asyncHandler, 
  validateParams,
  authenticateStaff,
  requireRole,
  AuthenticatedRequest 
} from '../middleware';
import { logInfo } from '../utils/logger';

const router = Router();

router.get(
  '/restaurant/:restaurantId',
  authenticateStaff,
  requireRole(['admin', 'manager']),
  validateParams(schemas.Id.transform((id) => ({ restaurantId: id }))),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const { role } = req.query as any;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Undefined restaurantId"
      });
    }

    logInfo('Fetching restaurant staff', { restaurantId, role });

    const staff = await queries.staff.getStaffByRestaurantAndRole(restaurantId, role);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: staff,
    });
  })
);

router.get(
  '/me',
  authenticateStaff,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const telegramId = req.user!.telegramId;

    logInfo('Fetching staff profile', { telegramId });

    const staffData = await queries.staff.getStaffByTelegramId(BigInt(telegramId));

    if (!staffData) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Staff profile not found',
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        staff: staffData.staff,
        restaurant: staffData.restaurant,
      },
    });
  })
);

export default router;
