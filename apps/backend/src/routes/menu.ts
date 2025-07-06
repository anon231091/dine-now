import { Router, Response } from 'express';
import { MenuSearchQuery, queries, RegisterMenuCategoryDto, RegisterMenuItemDto, UpdateMenuItemDto, UpdateMenuItemVariantDto, validators, VariantParams } from '@dine-now/database';
import { 
  AccessDeniedError, ApiResponse, BadRequestError, HTTP_STATUS,
  MenuCategory, MenuCategoryWithRestaurant, 
  MenuCategoryWithItems, NotFoundError,
  MenuItemDetailsWithCategory,
  MenuItemDetails,
  RestaurantWithCategories,
  MenuItem,
  MenuItemVariant,
  VariantWithMenuItem,
  PopularItem
} from '@dine-now/shared';
import { 
  asyncHandler, 
  validateQuery, 
  validateParams,
  AuthenticatedRequest, 
  validateBody,
  requireRole,
  hasRestaurantAccess
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
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuCategoryWithItems[]>>) => {
    const { restaurantId } = req.params;
    logInfo('Fetching menu for restaurant', { restaurantId });

    // Get menu data from database 
    const menu = await queries.menu.getMenuByRestaurantId(restaurantId!);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: menu,
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
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<PopularItem[]>>) => {
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
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<RestaurantWithCategories>>) => {
    const { restaurantId } = req.params;

    logInfo('Fetching menu categories', { restaurantId });

    const categories = await queries.menuCategory.getCategoriesByRestaurantId(restaurantId!);
    if (!categories) throw new NotFoundError('Restaurant not found');

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: categories,
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
  validateQuery(validators.MenuSearch),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuItemDetailsWithCategory[]>>) => {
    const { restaurantId } = req.params;
    const { categoryId } = req.query as MenuSearchQuery;
    logInfo('Searching menu items with variants', { restaurantId, categoryId });

    const items = await queries.menu.searchMenuItems(restaurantId!, req.query as MenuSearchQuery);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: items,
    });
  })
);

/**
 * @swagger
 * /api/menu/category/{categoryId}:
 *   get:
 *     summary: Get menu category details with restaurant
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu category details with restaurant
 *       404:
 *         description: Menu category not found
 */
router.get(
  '/category/:categoryId',
  validateParams(validators.CategoryParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuCategoryWithRestaurant>>) => {
    const { categoryId } = req.params;
    logInfo('Fetching menu category', { categoryId });

    const category = await queries.menuCategory.getCategoryDetailsByID(categoryId!);
    if (!category) throw new NotFoundError('Menu category not found');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: category
    })
  })
);

router.post(
  '/category',
  validateBody(validators.RegisterMenuCategory),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuCategory>>) => {
    const { restaurantId } = req.body as RegisterMenuCategoryDto;
    if (!hasRestaurantAccess(req, restaurantId)) throw new AccessDeniedError('No restaurant access');
    logInfo('Registering menu category', { restaurantId });

    const category = await queries.menuCategory.registerCategory(req.body);
    if (!category) throw new BadRequestError('Menu category has not been created');

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: category
    })
  }),
);

router.put(
  '/category/:categoryId',
  validateParams(validators.CategoryParams),
  validateBody(validators.UpdateMenuCategory),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuCategory>>) => {
    const { categoryId } = req.params;

    const category = await queries.menuCategory.getCategoryById(categoryId!);
    if (!category) throw new NotFoundError('Menu category not found');

    if (!hasRestaurantAccess(req, category.restaurantId)) throw new AccessDeniedError('No restaurant access');
    logInfo('Updating menu category', { categoryId });

    const updated = await queries.menuCategory.updateCategory(category.id, req.body);
    if (!updated) throw new BadRequestError('The menu category has not been updated');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updated
    })
  })
);

router.patch(
  '/category/:categoryId',
  validateParams(validators.CategoryParams),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuCategory>>) => {
    const { categoryId } = req.params;

    const category = await queries.menuCategory.getCategoryById(categoryId!);
    if (!category) throw new NotFoundError('Menu category not found');

    if (!hasRestaurantAccess(req, category.restaurantId)) throw new AccessDeniedError('No restaurant access');
    logInfo(`${category.isActive ? 'Deactivating' : 'Activating'} menu category`, { categoryId });

    const toggled = await queries.menuCategory.toggleCategory(category.id);
    if (!toggled) throw new BadRequestError();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: toggled
    })
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
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuItemDetails>>) => {
    const { itemId } = req.params;
    logInfo('Fetching menu item with variants', { itemId });

    const itemData = await queries.menu.getMenuItemDetailsById(itemId!);
    if (!itemData) throw new NotFoundError('Menu item not found');

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: itemData,
    });
  })
)

router.post(
  '/item',
  validateBody(validators.RegisterMenuItem),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuItemDetails>>) => {
    const { variants, restaurantId, categoryId } = req.body as RegisterMenuItemDto;
    logInfo('Registering menu item', { restaurantId, categoryId });

    if (!hasRestaurantAccess(req, restaurantId)) throw new AccessDeniedError('No restaurant access');
    const restaurant = await queries.restaurant.getRestaurantById(restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    const category = await queries.menuCategory.getCategoryById(categoryId);
    if (!category) throw new NotFoundError('Category not found');
    if (!hasRestaurantAccess(req, category.restaurantId)) throw new BadRequestError('No access to the category')

    // Check only variant is set as default
    if (variants.reduce((defaults, variant) => defaults + (!!variant.isDefault ? 1 : 0), 0) != 1) {
      throw new BadRequestError('Only one default variant are allowed');
    }

    const menuItem = await queries.menu.registerMenuItem(req.body);
    if (!menuItem) throw new BadRequestError('No menu item has been registered');

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: menuItem
    })
  })
)

router.put(
  '/item/:itemId',
  validateParams(validators.MenuItemParams),
  validateBody(validators.UpdateMenuItem),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuItem>>) => {
    const { itemId } = req.params;
    const { categoryId } = req.body as UpdateMenuItemDto;

    const item = await queries.menu.getMenuItemById(itemId!);
    if (!item) throw new NotFoundError('Menu item not found');
    if (!hasRestaurantAccess(req, item.restaurantId)) throw new AccessDeniedError('No restaurant access');

    if (categoryId) {
      const category = await queries.menuCategory.getCategoryById(categoryId);
      if (!category) throw new NotFoundError('Category not found');
      if (!hasRestaurantAccess(req, category.restaurantId)) throw new BadRequestError('No access to the category')
    }
    logInfo('Update menu item', { itemId, categoryId });

    const updated = await queries.menu.updateMenuItem(item.id, req.body);
    if (!updated) throw new BadRequestError('The menu item has not been updated');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updated
    })
  })
)

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
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<VariantWithMenuItem>>) => {
    const { variantId } = req.params;
    logInfo('Fetching menu item variant', { variantId });

    const variantData = await queries.menu.getVariantById(variantId!);
    if (!variantData) throw new NotFoundError('Menu item variant not found')

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: variantData,
    });
  })
);

router.put(
  '/variant/:variantId',
  validateParams(validators.VariantParams),
  validateBody(validators.UpdateMenuItemVariant),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuItemVariant>>) => {
    const { variantId } = req.params;
    logInfo('Updating menu item variant', { variantId });

    const variant = await queries.menu.getVariantById(variantId!);
    if (!variant) throw new NotFoundError('Menu item variant not found');
    if (!hasRestaurantAccess(req, variant.item.restaurantId)) throw new AccessDeniedError('No access to menu item variant');

    const updated = await queries.menu.updateVariantById(variant.id, req.body as UpdateMenuItemVariantDto);
    if (!updated) throw new BadRequestError('The menu item variant has not been updated');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updated
    })
  })
)

router.patch(
  '/item/:itemId',
  validateParams(validators.MenuItemParams),
  requireRole(['admin', 'manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuItem>>) => {
    const { itemId } = req.params;
    
    const item = await queries.menu.getMenuItemById(itemId!);
    if (!item) throw new NotFoundError('Menu item not found');
    if (!hasRestaurantAccess(req, item.restaurantId)) throw new AccessDeniedError('No restaurant access');
    logInfo(`${item.isActive ? 'Deactivating' : 'Activating'} menu item`, { itemId });

    const toggled = await queries.menu.toggleMenuItem(item.id);
    if (!toggled) throw new BadRequestError('The menu item has not been toggled');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: toggled
    })
  })
)

router.patch(
  '/item/:itemId/toggle',
  validateParams(validators.MenuItemParams),
  validateQuery(validators.VariantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<MenuItem | MenuItemVariant>>) => {
    const { itemId } = req.params;
    const { variantId } = req.query as VariantParams;

    const item = await queries.menu.getMenuItemById(itemId!);
    if (!item) throw new NotFoundError('Menu item not found');

    if (variantId) {
      const variant = await queries.menu.getVariantById(variantId);
      if (!variant) throw new NotFoundError('Menu item variant not found');
      else if (variant.menuItemId !== item.id) {
        throw new BadRequestError('Menu item & variant mismatch');
      }
    }

    if (!hasRestaurantAccess(req, item.restaurantId)) throw new AccessDeniedError('No restaurant access');
    logInfo(
      `${item.isAvailable ? 'Disable' : 'Enable'} menu item {${variantId} ? 'variant' : ''} availability`,
      { itemId, variantId }
    );

    const toggled = await queries.menu.toggleMenuItemAvailability(item.id, variantId);
    if (!toggled) throw new BadRequestError();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: toggled
    })
  })
)

export default router;
