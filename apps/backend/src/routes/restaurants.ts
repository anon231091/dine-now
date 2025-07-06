import { Router, Response } from 'express';
import { queries, validators } from '@dine-now/database';
import type { RegisterRestaurantDto, StaffQuery, UpdateRestaurantDto, } from '@dine-now/database';
import {
  Analytics, ApiResponse, BadRequestError, HTTP_STATUS,
  KitchenLoadStatus, NotFoundError, OrderStatus, Restaurant, RestaurantDetails,
  RestaurantWithStaff, RestaurantWithTelegramGroups, 
} from '@dine-now/shared';

import { 
  asyncHandler, 
  validateParams,
  validateQuery,
  AuthenticatedRequest, 
  onlySuperAdmin,
  validateBody,
  requireSuperAdminOrAdminOf,
  requireRestaurantAccess,
  requireRole,
} from '../middleware';
import { logInfo } from '../utils/logger';
import tableRoutes from './table';

const router: Router = Router();

router.use('/table', tableRoutes);

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
  onlySuperAdmin,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response<ApiResponse<Restaurant[]>>) => {
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
 *     summary: Get restaurant info
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
 *         description: Restaurant info
 *       404:
 *         description: Restaurant not found
 */
router.get(
  '/:restaurantId',
  validateParams(validators.RestaurantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Restaurant>>) => {
    const { restaurantId } = req.params;

    logInfo('Fetching restaurant info', { restaurantId });

    const restaurant = await queries.restaurant.getRestaurantById(restaurantId!);
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: restaurant,
    });
  })
);

/**
 * @swagger
 * /api/restaurants/{restaurantId}/details:
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
  '/:restaurantId/details',
  validateParams(validators.RestaurantParams),
  requireSuperAdminOrAdminOf,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<RestaurantDetails>>) => {
    const { restaurantId } = req.params;

    logInfo('Fetching restaurant details', { restaurantId });

    const restaurant = await queries.restaurant.getRestaurantDetails(restaurantId!);
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: restaurant,
    });
  })
);

router.post(
  '/',
  validateBody(validators.RegisterRestaurant),
  onlySuperAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Restaurant>>) => {
    logInfo('Onboarding new restaurant');

    const restaurant = await queries.restaurant.registerRestaurant(req.body as RegisterRestaurantDto);
    if (!restaurant) {
      throw new BadRequestError('No restaurant has been created');
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: restaurant,
    });
  })
);

router.put(
  '/:restaurantId',
  validateParams(validators.RestaurantParams),
  validateBody(validators.UpdateRestaurant),
  requireRestaurantAccess,
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Restaurant>>) => {
    const { restaurantId } = req.params;
    logInfo('Updating restaurant info', { restaurantId });

    const restaurant = await queries.restaurant.updateRestaurant(restaurantId!, req.body as UpdateRestaurantDto);
    if (!restaurant) throw new BadRequestError('The restaurant has not been updated');

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: restaurant,
    });
  })
);

router.patch(
  '/:restaurantId',
  validateParams(validators.RestaurantParams),
  requireRestaurantAccess,
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Restaurant>>) => {
    const { restaurantId } = req.params;
    const restaurant = await queries.restaurant.getRestaurantById(restaurantId!);
    if (!restaurant) throw new NotFoundError('Restaurant not found');
    logInfo(`${restaurant.isActive ? 'Deactivating' : 'Activating'} the restaurant`, { restaurantId });

    const toggled = await queries.restaurant.toggleRestaurant(restaurant.id);
    if (!toggled) throw new BadRequestError();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: toggled
    })
  })
)

router.delete(
  '/:restaurantId',
  validateParams(validators.RestaurantParams),
  onlySuperAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Restaurant>>) => {
    const { restaurantId } = req.params;
    logInfo('Deleting restaurant', { restaurantId });

    const restaurant = await queries.restaurant.deleteRestaurant(restaurantId!);
    if (!restaurant) {
      throw new BadRequestError('The restaurant has not been deleted');
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: restaurant,
    });
  })
);

/// Relation restaurant queries

router.get(
  '/:restaurantId/staff',
  validateParams(validators.RestaurantParams),
  validateQuery(validators.StaffQuery),
  requireRestaurantAccess,
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<RestaurantWithStaff>>) => {
    const { restaurantId } = req.params;

    logInfo('Fetching restaurant tables', { restaurantId });

    const restaurant = await queries.staff.getStaffByRestaurantId(restaurantId!, req.query as StaffQuery);
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: restaurant,
    });
  })
);

router.get(
  '/:restaurantId/groups',
  validateParams(validators.RestaurantParams),
  requireRestaurantAccess,
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<RestaurantWithTelegramGroups>>) => {
    const { restaurantId } = req.params;

    logInfo('Fetching restaurant telegram groups', { restaurantId });

    const restaurant = await queries.telegramGroup.getGroupsByRestaurant(restaurantId!);
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: restaurant,
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
  requireRestaurantAccess, // every restaurant staff has access to current kitchen status
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<KitchenLoadStatus>>) => {
    const { restaurantId } = req.params;

    logInfo('Fetching kitchen status', { restaurantId });

    // Get current kitchen load
    const kitchenLoad = await queries.kitchen.getKitchenLoad(restaurantId!);
    
    // Get active orders for more context
    const activeOrders = await queries.order.getActiveOrdersForKitchen(restaurantId!);
    
    // Group active orders by status
    const ordersByStatus = activeOrders.reduce((acc, row) => {
      const status = row.status;
      if (!acc[status]) acc[status] = 0;
      acc[status]++;
      return acc;
    }, {} as Record<OrderStatus, number>);

    const kitchenStatus = {
      ...kitchenLoad, 
      ordersByStatus,
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
  validateQuery(validators.AnalyticsQuery),
  requireRestaurantAccess,
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<Analytics>>) => {
    const { restaurantId } = req.params;
    const { dateFrom, dateTo, granularity } = req.query as any;

    logInfo('Fetching restaurant analytics', { restaurantId, dateFrom, dateTo });

    const dateFromObj = new Date(dateFrom);
    const dateToObj = new Date(dateTo);

    // Get order statistics
    const orderStats = await queries.analytics.getOrderStats(
      restaurantId!,
      dateFromObj,
      dateToObj
    );
    if (!orderStats) throw new NotFoundError('No orders between the dates');

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
