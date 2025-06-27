import { Router, Response } from 'express';
import { queries, validators } from '@dine-now/database';
import { HTTP_STATUS, NotFoundError } from '@dine-now/shared';
import { 
  asyncHandler, 
  validateParams,
  validateQuery,
  AuthenticatedRequest 
} from '../middleware';
import { logInfo } from '../utils/logger';

const router: Router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Restaurant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         address:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Table:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         number:
 *           type: string
 *         qrCode:
 *           type: string
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/restaurants:
 *   get:
 *     summary: Get all active restaurants
 *     tags: [Restaurants]
 *     responses:
 *       200:
 *         description: List of active restaurants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Restaurant'
 */
router.get(
  '/',
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    logInfo('Fetching active restaurants');

    const restaurants = await queries.restaurant.getActiveRestaurants();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: restaurants,
    });
  })
);

/**
 * @swagger
 * /api/restaurants/{restaurantId}:
 *   get:
 *     summary: Get restaurant details
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant details
 *       404:
 *         description: Restaurant not found
 */
router.get(
  '/:restaurantId',
  validateParams(validators.RestaurantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    logInfo('Fetching restaurant details', { restaurantId });

    const restaurant = await queries.restaurant.getRestaurantById(restaurantId!);

    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: restaurant,
    });
  })
);

/**
 * @swagger
 * /api/restaurants/{restaurantId}/tables:
 *   get:
 *     summary: Get restaurant tables
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant tables
 */
router.get(
  '/:restaurantId/tables',
  validateParams(validators.RestaurantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    logInfo('Fetching restaurant tables', { restaurantId });

    const tables = await queries.table.getTablesByRestaurant(restaurantId!);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: tables,
    });
  })
);

/**
 * @swagger
 * /api/restaurants/table/{tableId}:
 *   get:
 *     summary: Get table and restaurant info by its ID
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *         description: Table ID
 *     responses:
 *       200:
 *         description: Table and restaurant information
 *       404:
 *         description: Table not found or inactive
 */
router.get(
  '/table/:tableId',
  validateParams(validators.TableParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tableId } = req.params;

    logInfo('Fetching table by ID', { tableId });

    const tableData = await queries.table.getTableById(tableId!);

    if (!tableData) {
      throw new NotFoundError('Table not found or inactive');
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        table: tableData.table,
        restaurant: tableData.restaurant,
      },
    });
  })
);

/**
 * @swagger
 * /api/restaurants/{restaurantId}/kitchen-status:
 *   get:
 *     summary: Get kitchen status and current load
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kitchen status information
 */
router.get(
  '/:restaurantId/kitchen-status',
  validateParams(validators.RestaurantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    logInfo('Fetching kitchen status', { restaurantId });

    // Get current kitchen load
    const kitchenLoad = await queries.kitchen.getKitchenLoad(restaurantId!);
    
    // Calculate real-time kitchen load
    const calculatedLoad = await queries.kitchen.calculateKitchenLoad(restaurantId!);
    
    // Get active orders for more context
    const activeOrders = await queries.order.getActiveOrdersForKitchen(restaurantId!);
    
    // Group active orders by status
    const ordersByStatus = activeOrders.reduce((acc, row) => {
      const status = row.order.status;
      if (!acc[status]) acc[status] = 0;
      acc[status]++;
      return acc;
    }, {} as Record<string, number>);

    const kitchenStatus = {
      currentLoad: kitchenLoad || calculatedLoad,
      calculatedLoad,
      activeOrdersCount: calculatedLoad.currentOrders,
      ordersByStatus,
      estimatedWaitTime: Math.max(
        calculatedLoad.averagePreparationTime,
        calculatedLoad.currentOrders * 5 // 5 minutes per order in queue
      ),
      isOpen: true, // You can add business hours logic here
      lastUpdated: kitchenLoad?.lastUpdated || new Date(),
    };

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: kitchenStatus,
    });
  })
);

/**
 * @swagger
 * /api/restaurants/{restaurantId}/analytics:
 *   get:
 *     summary: Get restaurant analytics
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Restaurant analytics data
 */
router.get(
  '/:restaurantId/analytics',
  validateParams(validators.RestaurantParams),
  validateQuery(validators.AnalyticsQuery.omit({ restaurantId: true })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const { dateFrom, dateTo } = req.query as any;

    logInfo('Fetching restaurant analytics', { restaurantId, dateFrom, dateTo });

    const dateFromObj = new Date(dateFrom);
    const dateToObj = new Date(dateTo);

    // Get order statistics
    const orderStats = await queries.analytics.getOrderStats(
      restaurantId!,
      dateFromObj,
      dateToObj
    );

    // Get popular menu items
    const popularItems = await queries.analytics.getPopularMenuItems(
      restaurantId!,
      dateFromObj,
      dateToObj,
      10
    );

    // Get hourly distribution for today
    const today = new Date();
    const hourlyDistribution = await queries.analytics.getHourlyOrderDistribution(
      restaurantId!,
      today
    );

    const analytics = {
      orderStats,
      popularItems,
      hourlyDistribution,
      period: {
        from: dateFromObj,
        to: dateToObj,
        days: Math.ceil((dateToObj.getTime() - dateFromObj.getTime()) / (1000 * 60 * 60 * 24)),
      },
    };

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: analytics,
    });
  })
);

export default router;
