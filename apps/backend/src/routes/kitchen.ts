import { Router, Response } from 'express';
import { queries } from '@dine-now/database';
import { schemas, HTTP_STATUS } from '@dine-now/shared';
import { 
  asyncHandler, 
  validateParams,
  validateBody,
  authStaffMiddleware,
  requireRole,
  requireRestaurantAccess,
  AuthenticatedRequest 
} from '../middleware';
import { logInfo } from '../utils/logger';
import { broadcastKitchenUpdate } from '../websocket';

const router = Router();

router.get(
  '/load/:restaurantId',
  authStaffMiddleware,
  requireRestaurantAccess,
  validateParams(schemas.Id.transform((id) => ({ restaurantId: id }))),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Invalid restaurantId"
      });
    }

    logInfo('Fetching kitchen load', { restaurantId });

    const kitchenLoad = await queries.kitchen.getKitchenLoad(restaurantId);
    const calculatedLoad = await queries.kitchen.calculateKitchenLoad(restaurantId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        current: kitchenLoad,
        calculated: calculatedLoad,
        recommendation: calculatedLoad.currentOrders > 10 ? 'high_load' : 'normal',
      },
    });
  })
);

router.put(
  '/load/:restaurantId',
  authStaffMiddleware,
  requireRole(['admin', 'manager', 'kitchen']),
  requireRestaurantAccess,
  validateParams(schemas.Id.transform((id) => ({ restaurantId: id }))),
  validateBody(schemas.UpdateKitchenLoad.omit({ restaurantId: true })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const { currentOrders, averagePreparationTime } = req.body;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Undefined restaurantId"
      });
    }

    logInfo('Updating kitchen load', { restaurantId, currentOrders, averagePreparationTime });

    const updatedLoad = await queries.kitchen.updateKitchenLoad(restaurantId, {
      currentOrders,
      averagePreparationTime,
    });

    broadcastKitchenUpdate(restaurantId, 'kitchen_load_update', updatedLoad);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updatedLoad,
    });
  })
);

router.post(
  '/calculate/:restaurantId',
  authStaffMiddleware,
  requireRestaurantAccess,
  validateParams(schemas.Id.transform((id) => ({ restaurantId: id }))),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Undefined restaurantId"
      });
    }

    logInfo('Calculating kitchen load', { restaurantId });

    const calculatedLoad = await queries.kitchen.calculateKitchenLoad(restaurantId);
    
    // Update the stored load with calculated values
    const updatedLoad = await queries.kitchen.updateKitchenLoad(restaurantId, calculatedLoad);

    broadcastKitchenUpdate(restaurantId, 'kitchen_load_update', updatedLoad);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        calculated: calculatedLoad,
        updated: updatedLoad,
      },
    });
  })
);

export default router;
