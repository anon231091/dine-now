import { Router, Response } from 'express';
import { queries, validators } from '@dine-now/database';
import { HTTP_STATUS, NotFoundError } from '@dine-now/shared';
import { 
  asyncHandler, 
  validateParams,
  requireRole,
  authStaffMiddleware,
  AuthenticatedRequest 
} from '../middleware';
import { logInfo } from '../utils/logger';

const router: Router = Router();

router.get(
  '/restaurant/:restaurantId',
  authStaffMiddleware,
  requireRole(['admin', 'manager']),
  validateParams(validators.Id.transform((id) => ({ restaurantId: id }))),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const { role } = req.query as any;

    logInfo('Fetching restaurant staff', { restaurantId, role });

    const staff = await queries.staff.getStaffByRestaurantAndRole(restaurantId!, role);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: staff,
    });
  })
);

router.get(
  '/me',
  authStaffMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const telegramId = req.user!.telegramId;

    logInfo('Fetching staff profile', { telegramId });

    const staffData = await queries.staff.getStaffByTelegramId(BigInt(telegramId));

    if (!staffData) {
      throw new NotFoundError('Staff profile not found');
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
