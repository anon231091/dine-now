import { Router, Response } from 'express';
import { queries } from '@dine-now/database';
import { 
  schemas, 
  HTTP_STATUS, 
  generateOrderNumber, 
  estimatePreparationTime,
  calculateSubtotal,
  OrderStatus
} from '@dine-now/shared';
import { 
  asyncHandler, 
  validateBody, 
  validateParams,
  validateQuery,
  AuthenticatedRequest 
} from '../middleware';
import { logInfo, logError } from '../utils/logger';
import { broadcastOrderUpdate } from '../websocket';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         orderNumber:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready, served, cancelled]
 *         totalAmount:
 *           type: number
 *         estimatedPreparationMinutes:
 *           type: integer
 *         notes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     OrderItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         quantity:
 *           type: integer
 *         size:
 *           type: string
 *           enum: [small, medium, large]
 *         spiceLevel:
 *           type: string
 *           enum: [none, mild, medium, spicy, very_spicy]
 *         notes:
 *           type: string
 *         unitPrice:
 *           type: number
 *         subtotal:
 *           type: number
 */

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
 *             type: object
 *             properties:
 *               tableId:
 *                 type: string
 *               orderItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menuItemId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     size:
 *                       type: string
 *                     spiceLevel:
 *                       type: string
 *                     notes:
 *                       type: string
 *               notes:
 *                 type: string
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
  validateBody(schemas.CreateOrder),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tableId, orderItems, notes } = req.body;
    const customerId = req.user!.id;

    logInfo('Creating new order', { customerId, tableId, itemCount: orderItems.length });

    // Get table information to get restaurant ID
    const tableData = await queries.table.getTableById(tableId);
    
    if (!tableData) {
      logError(new Error('Table data not found'), { customerId, tableId, itemCount: orderItems.length });

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid tableId',
      });
    }

    const restaurantId = tableData.restaurant.id;

    // Validate all menu items and calculate totals
    const validatedOrderItems = [];
    let totalAmount = 0;
    let totalPreparationTime = 0;

    for (const orderItem of orderItems) {
      const menuItem = await queries.menu.getMenuItemById(orderItem.menuItemId);
      
      if (!menuItem || !menuItem.item.isAvailable) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: `Menu item ${orderItem.menuItemId} is not available`,
        });
      }

      const unitPrice = parseFloat(menuItem.item.price);
      const subtotal = calculateSubtotal(unitPrice, orderItem.quantity);
      totalAmount += subtotal;
      
      // Calculate preparation time
      const itemPrepTime = estimatePreparationTime(
        menuItem.item.preparationTimeMinutes,
        orderItem.quantity
      );
      totalPreparationTime = Math.max(totalPreparationTime, itemPrepTime);

      validatedOrderItems.push({
        menuItemId: orderItem.menuItemId,
        quantity: orderItem.quantity,
        size: orderItem.size,
        spiceLevel: orderItem.spiceLevel,
        notes: orderItem.notes,
        unitPrice: unitPrice.toString(),
        subtotal: subtotal.toString(),
      });
    }

    // Get kitchen load for more accurate timing
    const kitchenLoad = await queries.kitchen.getKitchenLoad(restaurantId);
    const loadMultiplier = kitchenLoad ? (kitchenLoad.currentOrders * 0.1) + 1 : 1;
    const estimatedPreparationMinutes = Math.ceil(totalPreparationTime * loadMultiplier);

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
    const orderData = await queries.order.createOrder({
      customerId,
      restaurantId,
      tableId,
      orderNumber,
      totalAmount: totalAmount.toString(),
      estimatedPreparationMinutes,
      notes,
      orderItems: validatedOrderItems,
    });

    // Update kitchen load
    if (kitchenLoad) {
      await queries.kitchen.updateKitchenLoad(restaurantId, {
        currentOrders: kitchenLoad.currentOrders + 1,
        averagePreparationTime: kitchenLoad.averagePreparationTime,
      });
    }

    if (!orderData.order) {
      logError(new Error('Failed to place order'), { customerId, tableId, itemCount: orderItems.length });

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Failed to place order',
      });
    }

    // Get complete order data for response
    const completeOrder = await queries.order.getOrderById(orderData.order.id);

    // Broadcast to restaurant staff
    broadcastOrderUpdate(restaurantId, 'new_order', completeOrder);

    logInfo('Order created successfully', { 
      orderId: orderData.order.id, 
      orderNumber,
      totalAmount 
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: completeOrder,
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
  validateParams(schemas.Id.transform((id) => ({ orderId: id }))),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const customerId = req.user!.id;

    if (!orderId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        errror: 'invalid orderId',
      });
    }

    logInfo('Fetching order details', { orderId, customerId });

    const order = await queries.order.getOrderById(orderId);

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check if customer owns this order
    if (order.order.customerId !== customerId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Access denied',
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: order,
    });
  })
);

/**
 * @swagger
 * /api/orders/customer/history:
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
  '/customer/history',
  validateQuery(schemas.Pagination),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerId = req.user!.id;
    const pagination = req.query as any;

    logInfo('Fetching customer order history', { customerId, pagination });

    const orders = await queries.order.getOrdersByCustomer(customerId, pagination);

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
  validateParams(schemas.Id.transform((id) => ({ orderId: id }))),
  validateBody(schemas.UpdateOrderStatus.omit({ orderId: true })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    if (!orderId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        errror: 'invalid orderId',
      });
    }

    logInfo('Updating order status', { orderId, status, notes });

    // Get current order
    const currentOrder = await queries.order.getOrderById(orderId);
    
    if (!currentOrder) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      'pending': [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      'confirmed': [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      'preparing': [OrderStatus.READY, OrderStatus.CANCELLED],
      'ready': [OrderStatus.SERVED],
      'served': [],
      'cancelled': [],
    };

    const currentStatus = currentOrder.order.status as OrderStatus;
    if (!validTransitions[currentStatus].includes(status as OrderStatus)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: `Cannot transition from ${currentStatus} to ${status}`,
      });
    }

    // Update order status
    const updatedOrder = await queries.order.updateOrderStatus(orderId, status, notes);

    // Update kitchen load if order is completed or cancelled
    if (status === 'served' || status === 'cancelled') {
      const kitchenLoad = await queries.kitchen.getKitchenLoad(currentOrder.order.restaurantId);
      if (kitchenLoad && kitchenLoad.currentOrders > 0) {
        await queries.kitchen.updateKitchenLoad(currentOrder.order.restaurantId, {
          currentOrders: kitchenLoad.currentOrders - 1,
          averagePreparationTime: kitchenLoad.averagePreparationTime,
        });
      }
    }

    // Get updated complete order data
    const completeOrder = await queries.order.getOrderById(orderId);

    // Broadcast status update
    broadcastOrderUpdate(currentOrder.order.restaurantId, 'order_status_update', {
      orderId,
      status,
      order: completeOrder,
    });

    // Broadcast to customer
    broadcastOrderUpdate(`customer_${currentOrder.order.customerId}`, 'order_status_update', {
      orderId,
      status,
      order: completeOrder,
    });

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
 *     security:
 *       - bearerAuth: []
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
 *         description: Filter by status (comma-separated)
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
  validateParams(schemas.Id.transform((id) => ({ restaurantId: id }))),
  validateQuery(schemas.OrderSearch.omit({ restaurantId: true })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const { status, page, limit } = req.query as any;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Undefined restaurantId"
      });
    }

    logInfo('Fetching restaurant orders', { restaurantId, status });

    const statusArray = status ? (Array.isArray(status) ? status : [status]) : undefined;
    const pagination = { page: page || 1, limit: limit || 20 };

    const orders = await queries.order.getOrdersByRestaurantAndStatus(
      restaurantId,
      statusArray,
      pagination
    );

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
  validateParams(schemas.Id.transform((id) => ({ restaurantId: id }))),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Undefined restaurantId"
      });
    }

    logInfo('Fetching active kitchen orders', { restaurantId });

    const activeOrders = await queries.order.getActiveOrdersForKitchen(restaurantId);

    // Group orders by order ID for better organization
    const ordersMap = new Map();
    
    for (const row of activeOrders) {
      const orderId = row.order.id;
      
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          order: row.order,
          customer: row.customer,
          table: row.table,
          items: [],
        });
      }
      
      ordersMap.get(orderId).items.push({
        orderItem: row.orderItems,
        menuItem: row.menuItem,
      });
    }

    const orders = Array.from(ordersMap.values());

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: orders,
    });
  })
);

export default router;
