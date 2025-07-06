import { Router, Response } from 'express';
import { CreateOrderDto, OrderItemDto, OrderSearchQuery, queries, UpdateOrderStatusDto, validators } from '@dine-now/database';
import { 
  HTTP_STATUS, 
  generateOrderNumber, 
  estimatePreparationTime,
  calculateSubtotal,
  OrderStatus,
  WS_EVENTS,
  NotFoundError,
  BadRequestError,
  ServerError,
  AccessDeniedError,
  ApiResponse,
  OrderDetails,
  OrderDetailsWithInfo,
  OrderWithTable,
} from '@dine-now/shared';
import { 
  asyncHandler, 
  validateBody, 
  validateParams,
  validateQuery,
  AuthenticatedRequest,
  hasRestaurantAccess,
} from '../middleware';
import { logInfo } from '../utils/logger';
import { broadcastOrderUpdate, CUSTOMER_ROOM_PREFIX, SERVICE_ROOM_PREFIX } from '../websocket';
import { getBotNotifier } from '../services/bot-notifier';

// Validate status transition
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['preparing', 'cancelled'],
  'preparing': ['ready', 'cancelled'],
  'ready': ['served'],
  'served': [],
  'cancelled': [],
} as const;

const router: Router = Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrder'
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  validateBody(validators.CreateOrder),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<OrderDetails>>) => {
    const { tableId, orderItems, notes } = req.body as CreateOrderDto;
    const customerName = `${req.user!.firstName}${req.user!.lastName ? ' ' + req.user!.lastName : ''}`;

    logInfo('Creating new order', { 
      customerTelegramId: req.user!.telegramId, 
      tableId, 
      itemCount: orderItems.length 
    });

    // Get table information to get restaurant ID
    const table = await queries.table.getTableById(tableId);
    if (!table) throw new NotFoundError('Table data not found');

    // Validate all order items and their variants
    const orderItemsData: OrderItemDto[] = [];
    let totalAmount = 0;
    let totalPreparationTime = 0;

    for (const orderItem of orderItems) {
      // Get variant information which includes menu item details
      const variant = await queries.menu.getVariantById(orderItem.variantId);
      if (!variant) throw new NotFoundError(`Menu item variant ${orderItem.variantId} is not available`);

      // Verify the menu item belong to the requested restaurant
      if (variant.item.restaurantId !== table.restaurantId) {
        throw new BadRequestError(`Menu item ${orderItem.menuItemId} does not belong to restaurant ${table.restaurantId}`);
      }

      // Verify the menu item matches what was requested
      if (variant.item.id !== orderItem.menuItemId) {
        throw new BadRequestError(`Variant ${orderItem.variantId} does not belong to menu item ${orderItem.menuItemId}`);
      }

      const subtotal = calculateSubtotal(variant.price, orderItem.quantity);
      totalAmount += subtotal;
      
      // Calculate preparation time based on base menu item time
      const itemPrepTime = estimatePreparationTime(
        variant.item.preparationTimeMinutes,
        orderItem.quantity
      );
      totalPreparationTime = Math.max(totalPreparationTime, itemPrepTime);

      orderItemsData.push({
        ...orderItem,
        subtotal: subtotal.toString(),
      });
    }

    // Get kitchen load for more accurate timing
    const kitchenLoad = await queries.kitchen.getKitchenLoad(table.restaurantId);
    const loadMultiplier = kitchenLoad ? (kitchenLoad.currentOrders * 0.1) + 1 : 1;
    const estimatedPreparationMinutes = Math.ceil(totalPreparationTime * loadMultiplier);

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
    const order = await queries.order.createOrder({
      customerTelegramId: req.user!.telegramId,
      customerName,
      restaurantId: table.restaurantId,
      tableId,
      orderNumber,
      totalAmount: totalAmount.toString(),
      estimatedPreparationMinutes,
      notes,
      orderItems: orderItemsData,
    });
    if (!order) throw new ServerError('Failed to place order');

    // Update kitchen load
    await queries.kitchen.upsertKitchenLoad(table.restaurantId);

    // Broadcast to restaurant staff
    broadcastOrderUpdate(table.restaurantId, WS_EVENTS.NEW_ORDER, order);

    // Notify bot service about new order
    const botNotifier = getBotNotifier();
    await botNotifier.notifyNewOrder(order, table.restaurantId);

    logInfo('Order created successfully', { 
      orderId: order.id, 
      orderNumber,
      totalAmount 
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: order,
    });
  })
);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get order details
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get(
  '/:orderId',
  validateParams(validators.OrderParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<OrderDetailsWithInfo>>) => {
    const { orderId } = req.params;
    const userTelegramId = req.user!.telegramId;
    const userType = req.user!.type;
    logInfo('Fetching order details', { orderId, userTelegramId, userType });

    const order = await queries.order.getOrderById(orderId!);
    if (!order) throw new NotFoundError('Order not found');

    // general users can only access their own orders
    if (userType === 'general' && order.customerTelegramId !== userTelegramId) {
      throw new AccessDeniedError('Access denied, you can only view your order');
    } else if (!hasRestaurantAccess(req, order.restaurantId)) {
      throw new AccessDeniedError('Access denied, this order is not in your restaurant');
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: order,
    });
  })
);

/**
 * @swagger
 * /api/orders/history:
 *   get:
 *     summary: Get customer order history
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Order history
 */
router.get(
  '/history',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerTelegramId = req.user!.telegramId;

    logInfo('Fetching customer order history', { customerTelegramId });

    const orders = await queries.order.getOrdersByCustomerTelegramId(customerTelegramId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: orders,
    });
  })
);

/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   patch:
 *     summary: Update order status (staff only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, preparing, ready, served, cancelled]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Order not found
 */
router.patch(
  '/:orderId/status',
  validateParams(validators.OrderParams),
  validateBody(validators.UpdateOrderStatus),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const { status, notes } = req.body as UpdateOrderStatusDto;
    logInfo('Updating order status', { orderId, status, notes });

    // Get current order
    const currentOrder = await queries.order.getOrderById(orderId!);
    if (!currentOrder) throw new NotFoundError('Order not found');

    // Check if staff has access to this restaurant
    if (!hasRestaurantAccess(req, currentOrder.restaurantId)) {
      throw new AccessDeniedError('Access denied to this restaurant');
    }

    const currentStatus = currentOrder.status;
    if (status && !validTransitions[currentStatus].includes(status)) {
      throw new BadRequestError(`Cannot transition from ${currentStatus} to ${status}`);
    }

    // Update order status
    const updatedOrder = await queries.order.updateOrderStatus(currentOrder.id, req.body);

    // Update kitchen load if order is completed or cancelled
    if (status === 'served' || status === 'cancelled') {
      await queries.kitchen.upsertKitchenLoad(currentOrder.restaurantId);
    } else if (status === 'ready') {
      // Broadcast to service staff to notify food ready to served
      broadcastOrderUpdate(`${SERVICE_ROOM_PREFIX}${currentOrder.restaurantId}`, WS_EVENTS.ORDER_STATUS_UPDATE, {
        orderId: currentOrder.id,
        status,
        order: updatedOrder,
      });
    }

    // Broadcast to customer
    broadcastOrderUpdate(`${CUSTOMER_ROOM_PREFIX}${currentOrder.customerTelegramId}`, WS_EVENTS.ORDER_STATUS_UPDATE, {
      orderId: currentOrder.id,
      status,
      order: updatedOrder,
    });

    // Notify bot service about status update
    const botNotifier = getBotNotifier();
    await botNotifier.notifyStatusUpdate(
      currentOrder.id, 
      status, 
      currentOrder.restaurantId,
      req.user?.firstName // Track who updated the status
    );

    logInfo('Order status updated successfully', { orderId, status });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updatedOrder,
    });
  })
);

/**
 * @swagger
 * /api/orders/restaurant/{restaurantId}:
 *   get:
 *     summary: Get orders for restaurant (staff only)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
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
 *         description: Restaurant orders
 */
router.get(
  '/restaurant/:restaurantId',
  validateParams(validators.RestaurantParams),
  validateQuery(validators.OrderSearch),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<OrderWithTable[]>>) => {
    const { restaurantId } = req.params;

    // Check if staff has access to this restaurant
    if (!hasRestaurantAccess(req, restaurantId!)) throw new AccessDeniedError('Access denied to this restaurant');
    logInfo('Fetching restaurant orders', { restaurantId });

    const orders = await queries.order.getOrdersByQuery(restaurantId!, req.query as OrderSearchQuery);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: orders,
    });
  })
);

/**
 * @swagger
 * /api/orders/restaurant/{restaurantId}/active:
 *   get:
 *     summary: Get active orders for kitchen display
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active orders for kitchen
 */
router.get(
  '/restaurant/:restaurantId/active',
  validateParams(validators.RestaurantParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse<OrderWithTable[]>>) => {
    const { restaurantId } = req.params;

    // Check if staff has access to this restaurant
    if (!hasRestaurantAccess(req, restaurantId!)) throw new AccessDeniedError('Access denied to this restaurant');
    logInfo('Fetching active kitchen orders', { restaurantId });

    const activeOrders = await queries.order.getActiveOrdersForKitchen(restaurantId!);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: activeOrders,
    });
  })
);

export default router;
