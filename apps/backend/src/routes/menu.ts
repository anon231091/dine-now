import { Router, Response } from 'express';
import { queries, validators } from '@dine-now/database';
import { HTTP_STATUS, NotFoundError } from '@dine-now/shared';
import { 
  asyncHandler, 
  validateQuery, 
  validateParams,
  AuthenticatedRequest 
} from '../middleware';
import { logInfo } from '../utils/logger';

const router: Router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     MenuItemVariant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         menuItemId:
 *           type: string
 *         size:
 *           type: string
 *           enum: [small, regular, large]
 *         name:
 *           type: string
 *         nameKh:
 *           type: string
 *         price:
 *           type: number
 *         isAvailable:
 *           type: boolean
 *         isDefault:
 *           type: boolean
 *         sortOrder:
 *           type: integer
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
 *         preparationTimeMinutes:
 *           type: integer
 *         imageUrl:
 *           type: string
 *         isAvailable:
 *           type: boolean
 *         variants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MenuItemVariant'
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
 *     summary: Get restaurant menu with categories, items, and variants
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
 *         description: Menu data retrieved successfully with variants
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
  validateParams(validators.RestaurantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    logInfo('Fetching menu with variants', { restaurantId });

    // Get menu data from database (now includes variants)
    const menuData = await queries.menu.getMenuByRestaurant(restaurantId!);

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
        // Ensure variants are included
        const itemWithVariants = {
          ...item,
          variants: item.variants || []
        };
        menuByCategory.get(category.id).items.push(itemWithVariants);
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
 *     summary: Search menu items with variant support
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
 *         description: Minimum price filter (applies to variants)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter (applies to variants)
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *           enum: [small, regular, large]
 *         description: Filter by variant size
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
 *         description: Search results with variants
 */
router.get(
  '/:restaurantId/search',
  validateParams(validators.RestaurantParams),
  validateQuery(validators.MenuSearch.omit({ restaurantId: true })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const searchParams = req.query as any;

    logInfo('Searching menu items with variants', { restaurantId, searchParams });

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
 *     summary: Get menu item details with variants
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu item details with variants
 *       404:
 *         description: Menu item not found
 */
router.get(
  '/item/:itemId',
  validateParams(validators.MenuItemParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { itemId } = req.params;
    
    logInfo('Fetching menu item with variants', { itemId });

    const itemData = await queries.menu.getMenuItemById(itemId!);

    if (!itemData) {
      throw new NotFoundError('Menu item not found');
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
 * /api/menu/variant/{variantId}:
 *   get:
 *     summary: Get specific menu item variant details
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu item variant details
 *       404:
 *         description: Variant not found
 */
router.get(
  '/variant/:variantId',
  validateParams(validators.VariantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { variantId } = req.params;

    logInfo('Fetching menu item variant', { variantId });

    const variantData = await queries.menu.getVariantById(variantId!);

    if (!variantData) {
      throw new NotFoundError('Menu item variant not found')
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        variant: variantData.variant,
        item: variantData.item,
        category: variantData.category,
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
  validateParams(validators.RestaurantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    logInfo('Fetching menu categories', { restaurantId });

    const menuData = await queries.menu.getMenuByRestaurant(restaurantId!);

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
 *     summary: Get popular menu items and variants for a restaurant
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
 *         description: Popular menu items with variants
 */
router.get(
  '/:restaurantId/popular',
  validateParams(validators.RestaurantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string) || 30;

    logInfo('Fetching popular menu items with variants', { restaurantId, limit, days });

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const dateTo = new Date();

    const popularItems = await queries.analytics.getPopularMenuItems(
      restaurantId!,
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
