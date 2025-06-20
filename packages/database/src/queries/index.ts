import { eq, and, desc, asc, gte, lte, inArray, sql, count } from 'drizzle-orm';
import { getDatabase } from '../config';
import * as schema from '../schema';
import type { 
  OrderStatus, 
  SpiceLevel, 
  ItemSize, 
  StaffRole,
  PaginationParams 
} from '@dine-now/shared';

// Restaurant queries
export const restaurantQueries = {
  // Get all active restaurants
  getActiveRestaurants: async () => {
    const db = getDatabase();
    return db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.isActive, true))
      .orderBy(asc(schema.restaurants.name));
  },

  // Get restaurant by ID
  getRestaurantById: async (id: string) => {
    const db = getDatabase();
    const result = await db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.id, id))
      .limit(1);
    return result[0] || null;
  },

  // Get restaurant with tables
  getRestaurantWithTables: async (id: string) => {
    const db = getDatabase();
    return db
      .select({
        restaurant: schema.restaurants,
        tables: schema.tables,
      })
      .from(schema.restaurants)
      .leftJoin(schema.tables, eq(schema.restaurants.id, schema.tables.restaurantId))
      .where(and(
        eq(schema.restaurants.id, id),
        eq(schema.restaurants.isActive, true)
      ));
  },
};

// Table queries
export const tableQueries = {
  // Get table by QR code
  getTableByQRCode: async (qrCode: string) => {
    const db = getDatabase();
    const result = await db
      .select({
        table: schema.tables,
        restaurant: schema.restaurants,
      })
      .from(schema.tables)
      .innerJoin(schema.restaurants, eq(schema.tables.restaurantId, schema.restaurants.id))
      .where(and(
        eq(schema.tables.qrCode, qrCode),
        eq(schema.tables.isActive, true),
        eq(schema.restaurants.isActive, true)
      ))
      .limit(1);
    return result[0] || null;
  },

  // Get table by ID
  getTableById: async (id: string) => {
    const db = getDatabase();
    const result = await db
      .select({
        table: schema.tables,
        restaurant: schema.restaurants,
      })
      .from(schema.tables)
      .innerJoin(schema.restaurants, eq(schema.tables.restaurantId, schema.restaurants.id))
      .where(and(
        eq(schema.tables.id, id),
        eq(schema.tables.isActive, true),
        eq(schema.restaurants.isActive, true)
      ))
      .limit(1);
    return result[0] || null;
  },

  // Get tables by restaurant
  getTablesByRestaurant: async (restaurantId: string) => {
    const db = getDatabase();
    return db
      .select()
      .from(schema.tables)
      .where(and(
        eq(schema.tables.restaurantId, restaurantId),
        eq(schema.tables.isActive, true)
      ))
      .orderBy(asc(schema.tables.number));
  },
};

// Customer queries
export const customerQueries = {
  // Get or create customer by Telegram ID
  getOrCreateCustomer: async (telegramData: {
    telegramId: string;
    firstName: string;
    lastName?: string;
    username?: string;
  }) => {
    const db = getDatabase();
    
    // Try to find existing customer
    const existing = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.telegramId, telegramData.telegramId))
      .limit(1);
    
    if (existing[0]) {
      // Update existing customer info
      const updated = await db
        .update(schema.customers)
        .set({
          firstName: telegramData.firstName,
          lastName: telegramData.lastName,
          username: telegramData.username,
          updatedAt: new Date(),
        })
        .where(eq(schema.customers.telegramId, telegramData.telegramId))
        .returning();
      return updated[0];
    }
    
    // Create new customer
    const created = await db
      .insert(schema.customers)
      .values(telegramData)
      .returning();
    return created[0];
  },

  // Get customer by ID
  getCustomerById: async (id: string) => {
    const db = getDatabase();
    const result = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, id))
      .limit(1);
    return result[0] || null;
  },
};

// Menu queries
export const menuQueries = {
  // Get menu by restaurant with categories and items
  getMenuByRestaurant: async (restaurantId: string) => {
    const db = getDatabase();
    return db
      .select({
        category: schema.menuCategories,
        item: schema.menuItems,
      })
      .from(schema.menuCategories)
      .leftJoin(
        schema.menuItems,
        and(
          eq(schema.menuCategories.id, schema.menuItems.categoryId),
          eq(schema.menuItems.isActive, true),
          eq(schema.menuItems.isAvailable, true)
        )
      )
      .where(and(
        eq(schema.menuCategories.restaurantId, restaurantId),
        eq(schema.menuCategories.isActive, true)
      ))
      .orderBy(
        asc(schema.menuCategories.sortOrder),
        asc(schema.menuItems.sortOrder)
      );
  },

  // Get menu item by ID
  getMenuItemById: async (id: string) => {
    const db = getDatabase();
    const result = await db
      .select({
        item: schema.menuItems,
        category: schema.menuCategories,
        restaurant: schema.restaurants,
      })
      .from(schema.menuItems)
      .innerJoin(schema.menuCategories, eq(schema.menuItems.categoryId, schema.menuCategories.id))
      .innerJoin(schema.restaurants, eq(schema.menuItems.restaurantId, schema.restaurants.id))
      .where(and(
        eq(schema.menuItems.id, id),
        eq(schema.menuItems.isActive, true),
        eq(schema.menuItems.isAvailable, true)
      ))
      .limit(1);
    return result[0] || null;
  },

  // Search menu items
  searchMenuItems: async (params: {
    restaurantId: string;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    isAvailable?: boolean;
    pagination?: PaginationParams;
  }) => {
    const db = getDatabase();
    const { restaurantId, categoryId, search, minPrice, maxPrice, isAvailable, pagination } = params;
    
    const conditions = [
      eq(schema.menuItems.restaurantId, restaurantId),
      eq(schema.menuItems.isActive, true),
    ];
    
    if (categoryId) {
      conditions.push(eq(schema.menuItems.categoryId, categoryId));
    }
    
    if (search) {
      conditions.push(
        sql`${schema.menuItems.name} ILIKE ${`%${search}%`} OR ${schema.menuItems.nameKh} ILIKE ${`%${search}%`}`
      );
    }
    
    if (minPrice !== undefined) {
      conditions.push(gte(schema.menuItems.price, minPrice.toString()));
    }
    
    if (maxPrice !== undefined) {
      conditions.push(lte(schema.menuItems.price, maxPrice.toString()));
    }
    
    if (isAvailable !== undefined) {
      conditions.push(eq(schema.menuItems.isAvailable, isAvailable));
    }
    
    const query = db
      .select({
        item: schema.menuItems,
        category: schema.menuCategories,
      })
      .from(schema.menuItems)
      .innerJoin(schema.menuCategories, eq(schema.menuItems.categoryId, schema.menuCategories.id))
      .where(and(...conditions))
      .orderBy(asc(schema.menuItems.sortOrder));
    
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query.limit(pagination.limit).offset(offset);
    }
    
    return query;
  },
};

// Order queries
export const orderQueries = {
  // Create new order
  createOrder: async (orderData: {
    customerId: string;
    restaurantId: string;
    tableId: string;
    orderNumber: string;
    totalAmount: string;
    estimatedPreparationMinutes: number;
    notes?: string;
    orderItems: Array<{
      menuItemId: string;
      quantity: number;
      size?: ItemSize;
      spiceLevel?: SpiceLevel;
      notes?: string;
      unitPrice: string;
      subtotal: string;
    }>;
  }) => {
    const db = getDatabase();
    
    return db.transaction(async (tx) => {
      // Insert order
      const [order] = await tx
        .insert(schema.orders)
        .values({
          customerId: orderData.customerId,
          restaurantId: orderData.restaurantId,
          tableId: orderData.tableId,
          orderNumber: orderData.orderNumber,
          totalAmount: orderData.totalAmount,
          estimatedPreparationMinutes: orderData.estimatedPreparationMinutes,
          notes: orderData.notes,
          status: 'pending',
        })
        .returning();

      if (!order) {
        return { order: null, orderItems: [] };
      }

      // Insert order items
      const orderItems = await tx
        .insert(schema.orderItems)
        .values(
          orderData.orderItems.map(item => ({
            ...item,
            orderId: order.id,
          }))
        )
        .returning();
      
      return { order, orderItems };
    });
  },

  // Get order by ID with details
  getOrderById: async (id: string) => {
    const db = getDatabase();
    const result = await db
      .select({
        order: schema.orders,
        customer: schema.customers,
        restaurant: schema.restaurants,
        table: schema.tables,
      })
      .from(schema.orders)
      .innerJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
      .innerJoin(schema.restaurants, eq(schema.orders.restaurantId, schema.restaurants.id))
      .innerJoin(schema.tables, eq(schema.orders.tableId, schema.tables.id))
      .where(eq(schema.orders.id, id))
      .limit(1);
    
    if (!result[0]) return null;
    
    // Get order items
    const orderItems = await db
      .select({
        orderItem: schema.orderItems,
        menuItem: schema.menuItems,
      })
      .from(schema.orderItems)
      .innerJoin(schema.menuItems, eq(schema.orderItems.menuItemId, schema.menuItems.id))
      .where(eq(schema.orderItems.orderId, id));
    
    return {
      ...result[0],
      orderItems,
    };
  },

  // Get orders by customer
  getOrdersByCustomer: async (customerId: string, pagination?: PaginationParams) => {
    const db = getDatabase();
    
    const query = db
      .select({
        order: schema.orders,
        restaurant: schema.restaurants,
        table: schema.tables,
      })
      .from(schema.orders)
      .innerJoin(schema.restaurants, eq(schema.orders.restaurantId, schema.restaurants.id))
      .innerJoin(schema.tables, eq(schema.orders.tableId, schema.tables.id))
      .where(eq(schema.orders.customerId, customerId))
      .orderBy(desc(schema.orders.createdAt));
    
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query.limit(pagination.limit).offset(offset);
    }
    
    return query;
  },

  // Get orders by restaurant and status
  getOrdersByRestaurantAndStatus: async (
    restaurantId: string, 
    status?: OrderStatus[],
    pagination?: PaginationParams
  ) => {
    const db = getDatabase();
    
    const conditions = [eq(schema.orders.restaurantId, restaurantId)];
    
    if (status && status.length > 0) {
      conditions.push(inArray(schema.orders.status, status));
    }
    
    const query = db
      .select({
        order: schema.orders,
        customer: schema.customers,
        table: schema.tables,
      })
      .from(schema.orders)
      .innerJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
      .innerJoin(schema.tables, eq(schema.orders.tableId, schema.tables.id))
      .where(and(...conditions))
      .orderBy(desc(schema.orders.createdAt));
    
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query.limit(pagination.limit).offset(offset);
    }
    
    return query;
  },

  // Update order status
  updateOrderStatus: async (orderId: string, status: OrderStatus, notes?: string) => {
    const db = getDatabase();
    
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (notes) {
      updateData.notes = notes;
    }
    
    // Set timestamps based on status
    switch (status) {
      case 'confirmed':
        updateData.confirmedAt = new Date();
        break;
      case 'ready':
        updateData.readyAt = new Date();
        break;
      case 'served':
        updateData.servedAt = new Date();
        // Calculate actual preparation time
        const order = await db
          .select({ confirmedAt: schema.orders.confirmedAt })
          .from(schema.orders)
          .where(eq(schema.orders.id, orderId))
          .limit(1);
        
        if (order[0]?.confirmedAt) {
          const actualMinutes = Math.floor(
            (updateData.servedAt.getTime() - order[0].confirmedAt.getTime()) / 60000
          );
          updateData.actualPreparationMinutes = actualMinutes;
        }
        break;
    }
    
    const [updated] = await db
      .update(schema.orders)
      .set(updateData)
      .where(eq(schema.orders.id, orderId))
      .returning();
    
    return updated;
  },

  // Get active orders for kitchen
  getActiveOrdersForKitchen: async (restaurantId: string) => {
    const db = getDatabase();
    return db
      .select({
        order: schema.orders,
        customer: schema.customers,
        table: schema.tables,
        orderItems: schema.orderItems,
        menuItem: schema.menuItems,
      })
      .from(schema.orders)
      .innerJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
      .innerJoin(schema.tables, eq(schema.orders.tableId, schema.tables.id))
      .innerJoin(schema.orderItems, eq(schema.orders.id, schema.orderItems.orderId))
      .innerJoin(schema.menuItems, eq(schema.orderItems.menuItemId, schema.menuItems.id))
      .where(and(
        eq(schema.orders.restaurantId, restaurantId),
        inArray(schema.orders.status, ['pending', 'confirmed', 'preparing'])
      ))
      .orderBy(asc(schema.orders.createdAt));
  },
};

// Staff queries
export const staffQueries = {
  // Get staff by telegram ID and restaurant
  getStaffByTelegramId: async (telegramId: string, restaurantId?: string) => {
    const db = getDatabase();
    
    const conditions = [
      eq(schema.staff.telegramId, telegramId),
      eq(schema.staff.isActive, true),
    ];
    
    if (restaurantId) {
      conditions.push(eq(schema.staff.restaurantId, restaurantId));
    }
    
    const result = await db
      .select({
        staff: schema.staff,
        restaurant: schema.restaurants,
      })
      .from(schema.staff)
      .innerJoin(schema.restaurants, eq(schema.staff.restaurantId, schema.restaurants.id))
      .where(and(...conditions))
      .limit(1);
    
    return result[0] || null;
  },

  // Get staff by restaurant and role
  getStaffByRestaurantAndRole: async (restaurantId: string, role?: StaffRole) => {
    const db = getDatabase();
    
    const conditions = [
      eq(schema.staff.restaurantId, restaurantId),
      eq(schema.staff.isActive, true),
    ];
    
    if (role) {
      conditions.push(eq(schema.staff.role, role));
    }
    
    return db
      .select()
      .from(schema.staff)
      .where(and(...conditions))
      .orderBy(asc(schema.staff.firstName));
  },
};

// Kitchen load queries
export const kitchenQueries = {
  // Get current kitchen load
  getKitchenLoad: async (restaurantId: string) => {
    const db = getDatabase();
    const result = await db
      .select()
      .from(schema.kitchenLoads)
      .where(eq(schema.kitchenLoads.restaurantId, restaurantId))
      .orderBy(desc(schema.kitchenLoads.lastUpdated))
      .limit(1);
    
    return result[0] || null;
  },

  // Update kitchen load
  updateKitchenLoad: async (restaurantId: string, data: {
    currentOrders: number;
    averagePreparationTime: number;
  }) => {
    const db = getDatabase();
    
    // Try to update existing record
    const [updated] = await db
      .update(schema.kitchenLoads)
      .set({
        ...data,
        lastUpdated: new Date(),
      })
      .where(eq(schema.kitchenLoads.restaurantId, restaurantId))
      .returning();
    
    if (updated) {
      return updated;
    }
    
    // Create new record if none exists
    const [created] = await db
      .insert(schema.kitchenLoads)
      .values({
        restaurantId,
        ...data,
      })
      .returning();
    
    return created;
  },

  // Calculate kitchen load from active orders
  calculateKitchenLoad: async (restaurantId: string) => {
    const db = getDatabase();
    
    // Count active orders
    const [orderCount] = await db
      .select({ count: count() })
      .from(schema.orders)
      .where(and(
        eq(schema.orders.restaurantId, restaurantId),
        inArray(schema.orders.status, ['pending', 'confirmed', 'preparing'])
      ));
    
    // Calculate average preparation time from recent completed orders
    const recentOrders = await db
      .select({ actualPreparationMinutes: schema.orders.actualPreparationMinutes })
      .from(schema.orders)
      .where(and(
        eq(schema.orders.restaurantId, restaurantId),
        eq(schema.orders.status, 'served'),
        gte(schema.orders.servedAt, sql`NOW() - INTERVAL '24 hours'`)
      ))
      .limit(50);
    
    const validPreparationTimes = recentOrders
      .map(o => o.actualPreparationMinutes)
      .filter((time): time is number => time !== null);
    
    const averagePreparationTime = validPreparationTimes.length > 0
      ? Math.round(validPreparationTimes.reduce((sum, time) => sum + time, 0) / validPreparationTimes.length)
      : 15; // Default to 15 minutes
    
    return {
      currentOrders: orderCount?.count || 0,
      averagePreparationTime,
    };
  },
};

// Analytics queries
export const analyticsQueries = {
  // Get order statistics
  getOrderStats: async (restaurantId: string, dateFrom: Date, dateTo: Date) => {
    const db = getDatabase();
    
    const [stats] = await db
      .select({
        totalOrders: count(),
        totalRevenue: sql<number>`SUM(CAST(${schema.orders.totalAmount} AS DECIMAL))`,
        averageOrderValue: sql<number>`AVG(CAST(${schema.orders.totalAmount} AS DECIMAL))`,
        cancelledOrders: sql<number>`COUNT(CASE WHEN ${schema.orders.status} = 'cancelled' THEN 1 END)`,
      })
      .from(schema.orders)
      .where(and(
        eq(schema.orders.restaurantId, restaurantId),
        gte(schema.orders.createdAt, dateFrom),
        lte(schema.orders.createdAt, dateTo)
      ));
    
    return stats;
  },

  // Get popular menu items
  getPopularMenuItems: async (restaurantId: string, dateFrom: Date, dateTo: Date, limit: number = 10) => {
    const db = getDatabase();
    
    return db
      .select({
        menuItem: schema.menuItems,
        totalQuantity: sql<number>`SUM(${schema.orderItems.quantity})`,
        totalRevenue: sql<number>`SUM(CAST(${schema.orderItems.subtotal} AS DECIMAL))`,
        orderCount: count(),
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .innerJoin(schema.menuItems, eq(schema.orderItems.menuItemId, schema.menuItems.id))
      .where(and(
        eq(schema.orders.restaurantId, restaurantId),
        gte(schema.orders.createdAt, dateFrom),
        lte(schema.orders.createdAt, dateTo),
        inArray(schema.orders.status, ['served', 'ready', 'preparing', 'confirmed'])
      ))
      .groupBy(schema.menuItems.id)
      .orderBy(desc(sql`SUM(${schema.orderItems.quantity})`))
      .limit(limit);
  },

  // Get hourly order distribution
  getHourlyOrderDistribution: async (restaurantId: string, date: Date) => {
    const db = getDatabase();
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${schema.orders.createdAt})`,
        orderCount: count(),
        totalRevenue: sql<number>`SUM(CAST(${schema.orders.totalAmount} AS DECIMAL))`,
      })
      .from(schema.orders)
      .where(and(
        eq(schema.orders.restaurantId, restaurantId),
        gte(schema.orders.createdAt, startOfDay),
        lte(schema.orders.createdAt, endOfDay)
      ))
      .groupBy(sql`EXTRACT(HOUR FROM ${schema.orders.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${schema.orders.createdAt})`);
  },
};

// Export all query modules
export const queries = {
  restaurant: restaurantQueries,
  table: tableQueries,
  customer: customerQueries,
  menu: menuQueries,
  order: orderQueries,
  staff: staffQueries,
  kitchen: kitchenQueries,
  analytics: analyticsQueries,
};
