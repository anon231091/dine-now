import { Router, Response } from 'express';
import { queries } from '@dine-now/database';
import { schemas, HTTP_STATUS } from '@dine-now/shared';
import { 
  asyncHandler, 
  validateQuery, 
  validateParams,
  AuthenticatedRequest 
} from '../middleware';
import { logInfo } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     MenuItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         nameKh:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         preparationTimeMinutes:
 *           type: integer
 *         imageUrl:
 *           type: string
 *         isAvailable:
 *           type: boolean
 *     MenuCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         nameKh:
 *           type: string
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/menu/{restaurantId}:
 *   get:
 *     summary: Get restaurant menu with categories and items
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Menu data retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       category:
 *                         $ref: '#/components/schemas/MenuCategory'
 *                       items:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/MenuItem'
 */
router.get(
  '/:restaurantId',
  validateParams(schemas.Id.transform((id) => ({ restaurantId: id }))),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Undefined restaurantId"
      });
    }

    logInfo('Fetching menu', { restaurantId });

    // Get menu data from database
    const menuData = await queries.menu.getMenuByRestaurant(restaurantId);

    // Group items by category
    const menuByCategory = new Map();
    
    for (const row of menuData) {
      const { category, item } = row;
      
      if (!menuByCategory.has(category.id)) {
        menuByCategory.set(category.id, {
          category,
          items: [],
        });
      }
      
      if (item) {
        menuByCategory.get(category.id).items.push(item);
      }
    }

    // Convert to array and sort by category sort order
    const menu = Array.from(menuByCategory.values())
      .sort((a, b) => a.category.sortOrder - b.category.sortOrder);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: menu,
    });
  })
);

/**
 * @swagger
 * /api/menu/{restaurantId}/search:
 *   get:
 *     summary: Search menu items
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for item name
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results
 */
router.get(
  '/:restaurantId/search',
  validateParams(schemas.Id.transform((id) => ({ restaurantId: id }))),
  validateQuery(schemas.MenuSearch.omit({ restaurantId: true })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const searchParams = req.query as any;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Undefined restaurantId"
      });
    }

    logInfo('Searching menu items', { restaurantId, searchParams });

    const items = await queries.menu.searchMenuItems({
      restaurantId,
      ...searchParams,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: items,
    });
  })
);

/**
 * @swagger
 * /api/menu/item/{itemId}:
 *   get:
 *     summary: Get menu item details
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu item details
 *       404:
 *         description: Menu item not found
 */
router.get(
  '/item/:itemId',
  validateParams(schemas.Id.transform((id) => ({ itemId: id }))),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Undefined itemId"
      });
    }
    logInfo('Fetching menu item', { itemId });

    const itemData = await queries.menu.getMenuItemById(itemId);

    if (!itemData) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        item: itemData.item,
        category: itemData.category,
        restaurant: itemData.restaurant,
      },
    });
  })
);

/**
 * @swagger
 * /api/menu/{restaurantId}/categories:
 *   get:
 *     summary: Get menu categories for a restaurant
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu categories retrieved successfully
 */
router.get(
  '/:restaurantId/categories',
  validateParams(schemas.Id.transform((id) => ({ restaurantId: id }))),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Undefined restaurantId"
      });
    }

    logInfo('Fetching menu categories', { restaurantId });

    const menuData = await queries.menu.getMenuByRestaurant(restaurantId);

    // Extract unique categories and sort
    const categories = Array.from(
      new Map(
        menuData.map(row => [row.category.id, row.category])
      ).values()
    ).sort((a, b) => a.sortOrder - b.sortOrder);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: categories,
    });
  })
);

/**
 * @swagger
 * /api/menu/{restaurantId}/popular:
 *   get:
 *     summary: Get popular menu items for a restaurant
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look back for popularity data
 *     responses:
 *       200:
 *         description: Popular menu items
 */
router.get(
  '/:restaurantId/popular',
  validateParams(schemas.Id.transform((id) => ({ restaurantId: id }))),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string) || 30;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Undefined restaurantId"
      });
    }

    logInfo('Fetching popular menu items', { restaurantId, limit, days });

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const dateTo = new Date();

    const popularItems = await queries.analytics.getPopularMenuItems(
      restaurantId,
      dateFrom,
      dateTo,
      limit
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: popularItems,
    });
  })
);

export default router;
