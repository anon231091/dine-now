import { Router, Response } from 'express';
import { queries, validators } from '@dine-now/database';
import { HTTP_STATUS, UnprocessableError } from '@dine-now/shared';
import { 
  asyncHandler, 
  validateParams,
  validateBody,
  authServiceMiddleware,
  requireRole,
  requireRestaurantAccess,
  AuthenticatedRequest 
} from '../middleware';
import { logError, logInfo } from '../utils/logger';
import { broadcastKitchenUpdate } from '../websocket';
import { getBotNotifier } from '../services/bot-notifier';

const router: Router = Router();

router.get(
  '/load/:restaurantId',
  authServiceMiddleware,
  requireRestaurantAccess,
  validateParams(validators.RestaurantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    logInfo('Fetching kitchen load', { restaurantId });

    const kitchenLoad = await queries.kitchen.getKitchenLoad(restaurantId!);
    const calculatedLoad = await queries.kitchen.calculateKitchenLoad(restaurantId!);

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
  authServiceMiddleware,
  requireRole(['admin', 'manager', 'kitchen']),
  requireRestaurantAccess,
  validateParams(validators.RestaurantParams),
  validateBody(validators.UpdateKitchenLoad.omit({ restaurantId: true })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const { currentOrders, averagePreparationTime } = req.body;

    logInfo('Updating kitchen load', { restaurantId, currentOrders, averagePreparationTime });

    const updatedLoad = await queries.kitchen.updateKitchenLoad(restaurantId!, {
      currentOrders,
      averagePreparationTime,
    });

    if (!updatedLoad) {
      let error = new UnprocessableError("Failed to update kitchen load");
      logError(error, { restaurantId });
      throw error
    }

    broadcastKitchenUpdate(restaurantId!, 'kitchen_load_update', updatedLoad);

    // Notify bot service about kitchen load update
    const botNotifier = getBotNotifier();
    await botNotifier.notifyKitchenLoadUpdate(restaurantId!, {
      currentOrders: updatedLoad.currentOrders,
      averagePreparationTime: updatedLoad.averagePreparationTime,
      estimatedWaitTime: updatedLoad.currentOrders * 5 // Simple estimation
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updatedLoad,
    });
  })
);

router.post(
  '/calculate/:restaurantId',
  authServiceMiddleware,
  requireRestaurantAccess,
  validateParams(validators.RestaurantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    logInfo('Calculating kitchen load', { restaurantId });

    const calculatedLoad = await queries.kitchen.calculateKitchenLoad(restaurantId!);
    
    // Update the stored load with calculated values
    const updatedLoad = await queries.kitchen.updateKitchenLoad(restaurantId!, calculatedLoad);

    if (!updatedLoad) {
      let error = new UnprocessableError("Failed to calculate kitchen load");
      logError(error, { restaurantId });
      throw error
    }

    broadcastKitchenUpdate(restaurantId!, 'kitchen_load_update', updatedLoad);

    // Notify bot service about kitchen load update
    const botNotifier = getBotNotifier();
    await botNotifier.notifyKitchenLoadUpdate(restaurantId!, {
      currentOrders: updatedLoad.currentOrders,
      averagePreparationTime: updatedLoad.averagePreparationTime,
      estimatedWaitTime: updatedLoad.currentOrders * 5
    });

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
