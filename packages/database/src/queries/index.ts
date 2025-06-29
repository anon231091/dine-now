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

// Menu queries with variants support
export const menuQueries = {
  // Get menu by restaurant with categories, items, and variants
  getMenuByRestaurant: async (restaurantId: string) => {
    const db = getDatabase();
    
    // Get menu items with their categories
    const menuData = await db
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

    // Get all variants for the restaurant's menu items
    const variants = await db
      .select({
        variant: schema.menuItemVariants,
        menuItemId: schema.menuItemVariants.menuItemId,
      })
      .from(schema.menuItemVariants)
      .innerJoin(schema.menuItems, eq(schema.menuItemVariants.menuItemId, schema.menuItems.id))
      .where(and(
        eq(schema.menuItems.restaurantId, restaurantId),
        eq(schema.menuItemVariants.isAvailable, true)
      ))
      .orderBy(asc(schema.menuItemVariants.sortOrder));

    // Group variants by menu item ID
    const variantsByMenuItem = new Map();
    variants.forEach(({ variant, menuItemId }) => {
      if (!variantsByMenuItem.has(menuItemId)) {
        variantsByMenuItem.set(menuItemId, []);
      }
      variantsByMenuItem.get(menuItemId).push(variant);
    });

    // Attach variants to menu items
    return menuData.map(row => ({
      ...row,
      item: row.item ? {
        ...row.item,
        variants: variantsByMenuItem.get(row.item.id) || []
      } : null
    }));
  },

  // Get menu item by ID with variants
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

    if (!result[0]) return null;

    // Get variants for this menu item
    const variants = await db
      .select()
      .from(schema.menuItemVariants)
      .where(and(
        eq(schema.menuItemVariants.menuItemId, id),
        eq(schema.menuItemVariants.isAvailable, true)
      ))
      .orderBy(asc(schema.menuItemVariants.sortOrder));

    return {
      ...result[0],
      item: {
        ...result[0].item,
        variants
      }
    };
  },

  // Get variant by ID
  getVariantById: async (variantId: string) => {
    const db = getDatabase();
    const result = await db
      .select({
        variant: schema.menuItemVariants,
        item: schema.menuItems,
        category: schema.menuCategories,
      })
      .from(schema.menuItemVariants)
      .innerJoin(schema.menuItems, eq(schema.menuItemVariants.menuItemId, schema.menuItems.id))
      .innerJoin(schema.menuCategories, eq(schema.menuItems.categoryId, schema.menuCategories.id))
      .where(and(
        eq(schema.menuItemVariants.id, variantId),
        eq(schema.menuItemVariants.isAvailable, true),
        eq(schema.menuItems.isActive, true),
        eq(schema.menuItems.isAvailable, true)
      ))
      .limit(1);
    
    return result[0] || null;
  },

  // Search menu items with variants
  searchMenuItems: async (params: {
    restaurantId: string;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    size?: ItemSize;
    isAvailable?: boolean;
    pagination?: PaginationParams;
  }) => {
    const db = getDatabase();
    const { restaurantId, categoryId, search, minPrice, maxPrice, size, isAvailable, pagination } = params;
    
    // Build all conditions first
    const conditions = [
      eq(schema.menuItems.restaurantId, restaurantId),
      eq(schema.menuItems.isActive, true),
      eq(schema.menuItemVariants.isAvailable, true), // Variant must be available
    ];
    
    if (categoryId) {
      conditions.push(eq(schema.menuItems.categoryId, categoryId));
    }
    
    if (search) {
      conditions.push(
        sql`${schema.menuItems.name} ILIKE ${`%${search}%`} OR ${schema.menuItems.nameKh} ILIKE ${`%${search}%`}`
      );
    }
    
    if (isAvailable !== undefined) {
      conditions.push(eq(schema.menuItems.isAvailable, isAvailable));
    }

    // Add variant-specific filters to conditions
    if (size) {
      conditions.push(eq(schema.menuItemVariants.size, size));
    }
    
    if (minPrice !== undefined) {
      conditions.push(gte(schema.menuItemVariants.price, minPrice.toString()));
    }
    
    if (maxPrice !== undefined) {
      conditions.push(lte(schema.menuItemVariants.price, maxPrice.toString()));
    }

    // Calculate pagination values
    const limit = pagination?.limit || 50;
    const offset = pagination ? (pagination.page - 1) * pagination.limit : 0;

    // Build the complete query with all conditions
    let results = await db
      .select({
        item: schema.menuItems,
        category: schema.menuCategories,
        variant: schema.menuItemVariants,
      })
      .from(schema.menuItems)
      .innerJoin(schema.menuCategories, eq(schema.menuItems.categoryId, schema.menuCategories.id))
      .innerJoin(schema.menuItemVariants, eq(schema.menuItems.id, schema.menuItemVariants.menuItemId))
      .where(and(...conditions))
      .orderBy(asc(schema.menuItems.sortOrder), asc(schema.menuItemVariants.sortOrder))
      .limit(limit)
      .offset(offset);

    // Group variants by menu item
    const itemsMap = new Map();
    results.forEach(({ item, category, variant }) => {
      if (!itemsMap.has(item.id)) {
        itemsMap.set(item.id, {
          item: { ...item, variants: [] },
          category
        });
      }
      itemsMap.get(item.id).item.variants.push(variant);
    });

    return Array.from(itemsMap.values());
  },
};

// Order queries updated for variants
export const orderQueries = {
  // Create new order with variants
  createOrder: async (orderData: {
    customerTelegramId: bigint;
    customerName: string;
    restaurantId: string;
    tableId: string;
    orderNumber: string;
    totalAmount: string;
    estimatedPreparationMinutes: number;
    notes?: string;
    orderItems: Array<{
      menuItemId: string;
      variantId: string;
      quantity: number;
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
          customerTelegramId: orderData.customerTelegramId,
          customerName: orderData.customerName,
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

      // Insert order items with variant references
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

  // Get order by ID with details including variants
  getOrderById: async (id: string) => {
    const db = getDatabase();
    const result = await db
      .select({
        order: schema.orders,
        restaurant: schema.restaurants,
        table: schema.tables,
      })
      .from(schema.orders)
      .innerJoin(schema.restaurants, eq(schema.orders.restaurantId, schema.restaurants.id))
      .innerJoin(schema.tables, eq(schema.orders.tableId, schema.tables.id))
      .where(eq(schema.orders.id, id))
      .limit(1);
    
    if (!result[0]) return null;
    
    // Get order items with menu items and variants
    const orderItems = await db
      .select({
        orderItem: schema.orderItems,
        menuItem: schema.menuItems,
        variant: schema.menuItemVariants,
      })
      .from(schema.orderItems)
      .innerJoin(schema.menuItems, eq(schema.orderItems.menuItemId, schema.menuItems.id))
      .innerJoin(schema.menuItemVariants, eq(schema.orderItems.variantId, schema.menuItemVariants.id))
      .where(eq(schema.orderItems.orderId, id));
    
    return {
      ...result[0],
      orderItems,
    };
  },

  // Get orders by customer telegram ID
  getOrdersByCustomerTelegramId: async (telegramId: bigint, pagination?: PaginationParams) => {
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
      .where(eq(schema.orders.customerTelegramId, telegramId))
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
        table: schema.tables,
      })
      .from(schema.orders)
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

  // Get active orders for kitchen with variants
  getActiveOrdersForKitchen: async (restaurantId: string) => {
    const db = getDatabase();
    return db
      .select({
        order: schema.orders,
        table: schema.tables,
        orderItems: schema.orderItems,
        menuItem: schema.menuItems,
        variant: schema.menuItemVariants,
      })
      .from(schema.orders)
      .innerJoin(schema.tables, eq(schema.orders.tableId, schema.tables.id))
      .innerJoin(schema.orderItems, eq(schema.orders.id, schema.orderItems.orderId))
      .innerJoin(schema.menuItems, eq(schema.orderItems.menuItemId, schema.menuItems.id))
      .innerJoin(schema.menuItemVariants, eq(schema.orderItems.variantId, schema.menuItemVariants.id))
      .where(and(
        eq(schema.orders.restaurantId, restaurantId),
        inArray(schema.orders.status, ['pending', 'confirmed', 'preparing'])
      ))
      .orderBy(asc(schema.orders.createdAt));
  },
};

// Staff queries (unchanged)
export const staffQueries = {
  // Get staff by telegram ID and restaurant
  getStaffByTelegramId: async (telegramId: bigint, restaurantId?: string) => {
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

// Kitchen load queries (unchanged)
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

// Analytics queries updated for variants
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

  // Get popular menu items with variants
  getPopularMenuItems: async (restaurantId: string, dateFrom: Date, dateTo: Date, limit: number = 10) => {
    const db = getDatabase();
    
    return db
      .select({
        menuItem: schema.menuItems,
        variant: schema.menuItemVariants,
        totalQuantity: sql<number>`SUM(${schema.orderItems.quantity})`,
        totalRevenue: sql<number>`SUM(CAST(${schema.orderItems.subtotal} AS DECIMAL))`,
        orderCount: count(),
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .innerJoin(schema.menuItems, eq(schema.orderItems.menuItemId, schema.menuItems.id))
      .innerJoin(schema.menuItemVariants, eq(schema.orderItems.variantId, schema.menuItemVariants.id))
      .where(and(
        eq(schema.orders.restaurantId, restaurantId),
        gte(schema.orders.createdAt, dateFrom),
        lte(schema.orders.createdAt, dateTo),
        inArray(schema.orders.status, ['served', 'ready', 'preparing', 'confirmed'])
      ))
      .groupBy(schema.menuItems.id, schema.menuItemVariants.id)
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

// packages/database/src/queries/bot.ts
export const botQueries = {
  getGroupByTelegramId: async (chatId: bigint) => {
    const db = getDatabase();
    const result = await db
      .select()
      .from(schema.telegramGroups)
      .where(eq(schema.telegramGroups.chatId, chatId))
      .limit(1);
    return result[0] || null;
  },

  getGroupsByRestaurant: async (restaurantId: string) => {
    const db = getDatabase();
    const result = await db
      .select()
      .from(schema.telegramGroups)
      .where(eq(schema.telegramGroups.restaurantId, restaurantId));
    return result || null;
  },

  registerGroup: async (data: {
    chatId: bigint;
    restaurantId: string;
    name: string;
    language?: string;
  }) => {
    const db = getDatabase();
    const [group] = await db
      .insert(schema.telegramGroups)
      .values(data)
      .returning();
    return group;
  },
};

// Export all query modules
export const queries = {
  restaurant: restaurantQueries,
  table: tableQueries,
  menu: menuQueries,
  order: orderQueries,
  staff: staffQueries,
  kitchen: kitchenQueries,
  analytics: analyticsQueries,
  bot: botQueries,
};
