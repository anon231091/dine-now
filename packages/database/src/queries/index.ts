import { eq, and, desc, asc, gte, lte, inArray, sql, count } from 'drizzle-orm';
import { getDatabase } from '../config';
import * as schema from '../schema';
import {
  transformDatabaseRow,
  transformDatabaseRows,
  transformDatabaseRowWithDecimals
} from '../utils/transforms';
import type { 
  OrderStatus, 
  ItemSize, 
  StaffRole,
  PaginationParams,
  Restaurant,
  RestaurantWithStaff,
  CreateRestaurantDto,
  Table,
  TableWithRestaurant,
  Staff,
  StaffWithRestaurant,
  CreateStaffDto,
  TelegramGroup,
  TelegramGroupWithRestaurant,
  CreateTelegramGroupDto,
  UpdateTelegramGroupDto,
  MenuItemVariant,
  MenuCategory,
  MenuItemWithCategory,
  MenuItem,
  MenuItemWithRestaurant,
  MenuItemVariantWithCategory,
  ID,
  CreateOrderDto,
  Order,
  OrderItem,
  OrderDetails,
  OrderDetailsWithInfo,
  OrderWithInfo,
  OrderWithTable,
  UpdateOrderStatusDto,
  KitchenLoad,
  KitchenLoadInfo,
  OrderStats,
  PopularItem,
  HourlyOrderDistribution
} from '@dine-now/shared';

// Restaurant queries
export const restaurantQueries = {
  // Get all active restaurants
  getActiveRestaurants: async (): Promise<Restaurant[]> => {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.isActive, true))
      .orderBy(asc(schema.restaurants.name));

    return transformDatabaseRows<Restaurant>(rows);
  },

  // Get restaurant by ID
  getRestaurantById: async (id: ID): Promise<Restaurant | undefined> => {
    const db = getDatabase();
    const result = await db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.id, id))
      .limit(1);
    return result[0] ? transformDatabaseRow<Restaurant>(result[0]) : undefined;
  },

  // Get restaurant with tables
  getRestaurantWithTables: async (id: ID) => {
    const db = getDatabase();
    const rows = await db
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
    
    return transformDatabaseRows(rows);
  },

  // Get restaurant with staff and groups
  getRestaurantWithDetails: async (id: ID): Promise<RestaurantWithStaff | undefined> => {
    const db = getDatabase();
    
    const restaurant = await db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.id, id))
      .limit(1);
    
    if (!restaurant[0]) return undefined;
    
    const staff = await db
      .select()
      .from(schema.staff)
      .where(and(
        eq(schema.staff.restaurantId, id),
        eq(schema.staff.isActive, true)
      ));
    
    const telegramGroups = await db
      .select()
      .from(schema.telegramGroups)
      .where(and(
        eq(schema.telegramGroups.restaurantId, id),
        eq(schema.telegramGroups.isActive, true)
      ));
    
    return {
      ...transformDatabaseRow<Restaurant>(restaurant[0]),
      staff,
      telegramGroups
    };
  },

  // Create restaurant
  createRestaurant: async (data: CreateRestaurantDto): Promise<Restaurant | undefined> => {
    const db = getDatabase();
    const [restaurant] = await db
      .insert(schema.restaurants)
      .values(data)
      .returning();
    return restaurant ? transformDatabaseRow(restaurant) : undefined;
  },

  // Update restaurant
  updateRestaurant: async (id: ID, data: Partial<CreateRestaurantDto>): Promise<Restaurant | undefined> => {
    const db = getDatabase();
    const [updated] = await db
      .update(schema.restaurants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.restaurants.id, id))
      .returning();
    return updated ? transformDatabaseRow(updated) : undefined;
  },
};

// Table queries
export const tableQueries = {
  // Get table by ID with restaurant info
  getTableById: async (id: ID): Promise<TableWithRestaurant | undefined> => {
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

    if (!result[0]) return undefined;
    return {
      ...transformDatabaseRow<Table>(result[0].table),
      restaurant: transformDatabaseRow<Restaurant>(result[0].restaurant)
    };
  },

  // Get tables by restaurant
  getTablesByRestaurant: async (restaurantId: ID): Promise<Table[]> => {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(schema.tables)
      .where(and(
        eq(schema.tables.restaurantId, restaurantId),
        eq(schema.tables.isActive, true)
      ))
      .orderBy(asc(schema.tables.number));

    return transformDatabaseRows<Table>(rows)
  },

  // Create table
  createTable: async (data: {
    restaurantId: ID;
    number: string;
  }): Promise<Table | undefined> => {
    const db = getDatabase();
    const [table] = await db
      .insert(schema.tables)
      .values(data)
      .returning();
    return table ? transformDatabaseRow(table) : undefined;
  },
};

// Staff queries
export const staffQueries = {
  // Get staff by telegram ID
  getStaffByTelegramId: async (telegramId: bigint): Promise<StaffWithRestaurant | undefined> => {
    const db = getDatabase();
    const result = await db
      .select({
        staff: schema.staff,
        restaurant: schema.restaurants,
      })
      .from(schema.staff)
      .innerJoin(schema.restaurants, eq(schema.staff.restaurantId, schema.restaurants.id))
      .where(and(
        eq(schema.staff.telegramId, telegramId),
        eq(schema.staff.isActive, true),
        eq(schema.restaurants.isActive, true)
      ))
      .limit(1);

    if (!result[0]) return undefined;
    return {
      ...transformDatabaseRow<Staff>(result[0].staff),
      restaurant: transformDatabaseRow<Restaurant>(result[0].restaurant)
    }
  },

  // Get staff by restaurant and role
  getStaffByRestaurantAndRole: async (restaurantId: ID, role?: StaffRole): Promise<Staff[]> => {
    const db = getDatabase();
    
    const conditions = [
      eq(schema.staff.restaurantId, restaurantId),
      eq(schema.staff.isActive, true),
    ];
    
    if (role) {
      conditions.push(eq(schema.staff.role, role));
    }
    
    const rows = await db
      .select()
      .from(schema.staff)
      .where(and(...conditions))
      .orderBy(asc(schema.staff.role), asc(schema.staff.telegramId));

    return transformDatabaseRows<Staff>(rows);
  },

  // Create staff member
  createStaff: async (data: CreateStaffDto): Promise<Staff | undefined> => {
    const db = getDatabase();
    const [staff] = await db
      .insert(schema.staff)
      .values(data)
      .returning();
    return staff;
  },

  // Update staff role
  updateStaffRole: async (staffId: ID, role: StaffRole): Promise<Staff | undefined> => {
    const db = getDatabase();
    const [updated] = await db
      .update(schema.staff)
      .set({ role, updatedAt: new Date() })
      .where(eq(schema.staff.id, staffId))
      .returning();
    return updated;
  },

  // Deactivate staff
  deactivateStaff: async (staffId: ID): Promise<Staff | undefined> => {
    const db = getDatabase();
    const [updated] = await db
      .update(schema.staff)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.staff.id, staffId))
      .returning();
    return updated;
  },
};

// Telegram Group queries
export const telegramGroupQueries = {
  // Get group by chat ID
  getGroupByTelegramId: async (chatId: bigint): Promise<TelegramGroupWithRestaurant | undefined> => {
    const db = getDatabase();
    const result = await db
      .select({
        group: schema.telegramGroups,
        restaurant: schema.restaurants,
      })
      .from(schema.telegramGroups)
      .innerJoin(schema.restaurants, eq(schema.telegramGroups.restaurantId, schema.restaurants.id))
      .where(and(
        eq(schema.telegramGroups.chatId, chatId),
        eq(schema.telegramGroups.isActive, true)
      ))
      .limit(1);

    if (!result[0]) return undefined;
    return {
      ...transformDatabaseRow<TelegramGroup>(result[0].group),
      restaurant: transformDatabaseRow<Restaurant>(result[0].restaurant)
    }
  },

  // Get groups by restaurant
  getGroupsByRestaurant: async (restaurantId: ID): Promise<TelegramGroup[]> => {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(schema.telegramGroups)
      .where(and(
        eq(schema.telegramGroups.restaurantId, restaurantId),
        eq(schema.telegramGroups.isActive, true)
      ))
      .orderBy(asc(schema.telegramGroups.groupType));

    return transformDatabaseRows<TelegramGroup>(rows);
  },

  // Register group
  registerGroup: async (data: CreateTelegramGroupDto): Promise<TelegramGroup | undefined> => {
    const db = getDatabase();
    const [group] = await db
      .insert(schema.telegramGroups)
      .values(data)
      .returning();
    return group ? transformDatabaseRow<TelegramGroup>(group) : undefined;
  },

  // Update group
  updateGroup: async (groupId: ID, data: Partial<UpdateTelegramGroupDto>): Promise<TelegramGroup | undefined> => {
    const db = getDatabase();
    const [updated] = await db
      .update(schema.telegramGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.telegramGroups.id, groupId))
      .returning();
    return updated ? transformDatabaseRow<TelegramGroup>(updated) : undefined;
  },
};

// Menu queries with variants support
export const menuQueries = {
  // Get menu by restaurant with categories, items, and variants
  getMenuByRestaurant: async (restaurantId: ID): Promise<MenuItemWithCategory[]> => {
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

    // Transform variants and group by menu item ID
    const transformedVariants = variants.map(({ variant, menuItemId }) => ({
      variant: transformDatabaseRowWithDecimals<MenuItemVariant>(variant),
      menuItemId
    }));

    // Group variants by menu item ID
    const variantsByMenuItem = new Map<string, MenuItemVariant[]>();
    transformedVariants.forEach(({ variant, menuItemId }) => {
      if (!variantsByMenuItem.has(menuItemId)) {
        variantsByMenuItem.set(menuItemId, []);
      }
      variantsByMenuItem.get(menuItemId)!.push(variant);
    });

    // Transform menu data and attach variants
    return menuData.filter(row => !!row.item).map(row => ({
      ...transformDatabaseRow<MenuItem>(row.item),
      category: transformDatabaseRow<MenuCategory>(row.category),
      variants: variantsByMenuItem.get(row.item!.id) || []
    }));
  },

  // Get menu item by ID with variants
  getMenuItemById: async (id: ID): Promise<MenuItemWithRestaurant | undefined> => {
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

    if (!result[0]) return undefined;

    // Get variants for this menu item
    const variantRows = await db
      .select()
      .from(schema.menuItemVariants)
      .where(and(
        eq(schema.menuItemVariants.menuItemId, id),
        eq(schema.menuItemVariants.isAvailable, true)
      ))
      .orderBy(asc(schema.menuItemVariants.sortOrder));
    const variants = variantRows.map(row => transformDatabaseRowWithDecimals<MenuItemVariant>(row));

    return {
      ...transformDatabaseRow<MenuItem>(result[0].item),
      category: transformDatabaseRow<MenuCategory>(result[0].category),
      restaurant: transformDatabaseRow<Restaurant>(result[0].restaurant),
      variants
    };
  },

  // Get variant by ID
  getVariantById: async (variantId: ID): Promise<MenuItemVariantWithCategory | undefined> => {
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
    
    if (!result[0]) return undefined;
    return {
      ...transformDatabaseRowWithDecimals<MenuItemVariant>(result[0].variant),
      item: transformDatabaseRow<MenuItem>(result[0].item),
      category: transformDatabaseRow<MenuCategory>(result[0].category)
    }
  },

  // Search menu items with variants
  searchMenuItems: async (params: {
    restaurantId: ID;
    categoryId?: ID;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    size?: ItemSize;
    isAvailable?: boolean;
    pagination?: PaginationParams;
  }): Promise<MenuItemWithCategory[]> => {
    const db = getDatabase();
    const { restaurantId, categoryId, search, minPrice, maxPrice, size, isAvailable, pagination } = params;
    
    // Build all conditions first
    const conditions = [
      eq(schema.menuItems.restaurantId, restaurantId),
      eq(schema.menuItems.isActive, true),
      eq(schema.menuItemVariants.isAvailable, true),
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
    const itemsMap = new Map<ID, MenuItemWithCategory>();
    results.forEach(({ item, category, variant }) => {
      if (!itemsMap.has(item.id)) {
        itemsMap.set(item.id, {
          ...transformDatabaseRow<MenuItem>(item),
          category: transformDatabaseRow<MenuCategory>(category),
          variants: [],
        });
      }
      itemsMap.get(item.id)!.variants.push(transformDatabaseRowWithDecimals<MenuItemVariant>(variant));
    });

    return Array.from(itemsMap.values());
  },

  // Toggle menu item availability
  toggleMenuItemAvailability: async (itemId: ID, isAvailable: boolean, variantId?: ID): Promise<MenuItem | MenuItemVariant | undefined> => {
    const db = getDatabase();
    
    if (variantId) {
      // Toggle specific variant
      const [updated] = await db
        .update(schema.menuItemVariants)
        .set({ isAvailable, updatedAt: new Date() })
        .where(eq(schema.menuItemVariants.id, variantId))
        .returning();
      return updated ? transformDatabaseRowWithDecimals<MenuItemVariant>(updated) : undefined;
    } else {
      // Toggle entire menu item
      const [updated] = await db
        .update(schema.menuItems)
        .set({ isAvailable, updatedAt: new Date() })
        .where(eq(schema.menuItems.id, itemId))
        .returning();
      return updated ? transformDatabaseRow<MenuItem>(updated) : undefined;
    }
  },
};

// Order queries updated for variants and direct telegram ID
export const orderQueries = {
  // Create new order with variants
  createOrder: async (orderData: CreateOrderDto): Promise<OrderDetails | undefined> => {
    const db = getDatabase();
    
    return db.transaction(async (tx) => {
      // Insert order
      const [orderRow] = await tx
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
        })
        .returning();

      if (!orderRow) return undefined;
      const order = transformDatabaseRowWithDecimals<Order>(orderRow);

      // Insert order items with variant references
      const orderItemRows = await tx
        .insert(schema.orderItems)
        .values(
          orderData.orderItems.map(item => ({
            ...item,
            orderId: order.id,
          }))
        )
        .returning();
      const orderItems = orderItemRows.map(row => transformDatabaseRowWithDecimals<OrderItem>(row));
      
      return { ...order, orderItems };
    });
  },

  // Get order by ID with details including variants
  getOrderById: async (id: string): Promise<OrderDetailsWithInfo | undefined> => {
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
    
    if (!result[0]) return undefined;
    
    // Get order items with menu items and variants
    const orderItemRows = await db
      .select({
        orderItem: schema.orderItems,
        menuItem: schema.menuItems,
        variant: schema.menuItemVariants,
      })
      .from(schema.orderItems)
      .innerJoin(schema.menuItems, eq(schema.orderItems.menuItemId, schema.menuItems.id))
      .innerJoin(schema.menuItemVariants, eq(schema.orderItems.variantId, schema.menuItemVariants.id))
      .where(eq(schema.orderItems.orderId, id));
    const orderItems = orderItemRows.map(row => transformDatabaseRowWithDecimals<OrderItem>({
      ...row.orderItem,
      menuItem: row.menuItem,
      variant: row.variant
    }));
    
    return {
      ...transformDatabaseRowWithDecimals<Order>(result[0].order),
      restaurant: transformDatabaseRow<Restaurant>(result[0].restaurant),
      table: transformDatabaseRow<Table>(result[0].table),
      orderItems,
    };
  },

  // Get orders by customer telegram ID
  getOrdersByCustomerTelegramId: async (telegramId: bigint, pagination: PaginationParams = { page: 0, limit: 20 }): Promise<OrderWithInfo[]> => {
    const db = getDatabase();
    
    const offset = (pagination.page - 1) * pagination.limit;
    const rows = await db
      .select({
        order: schema.orders,
        restaurant: schema.restaurants,
        table: schema.tables,
      })
      .from(schema.orders)
      .innerJoin(schema.restaurants, eq(schema.orders.restaurantId, schema.restaurants.id))
      .innerJoin(schema.tables, eq(schema.orders.tableId, schema.tables.id))
      .where(eq(schema.orders.customerTelegramId, telegramId))
      .orderBy(desc(schema.orders.createdAt))
      .limit(pagination.limit)
      .offset(offset);
    
    return rows.map(row => ({
      ...transformDatabaseRowWithDecimals<Order>(row.order),
      restaurant: transformDatabaseRow<Restaurant>(row.restaurant),
      table: transformDatabaseRow<Table>(row.table)
    }));
  },

  // Get orders by restaurant and status
  getOrdersByRestaurantAndStatus: async (
    restaurantId: ID, 
    status?: OrderStatus[],
    pagination: PaginationParams = { page: 0, limit: 20 },
  ): Promise<OrderWithTable[]> => {
    const db = getDatabase();
    
    const conditions = [eq(schema.orders.restaurantId, restaurantId)];
    
    if (status && status.length > 0) {
      conditions.push(inArray(schema.orders.status, status));
    }
    
    const offset = (pagination.page - 1) * pagination.limit;
    const rows = await db
      .select({
        order: schema.orders,
        table: schema.tables,
      })
      .from(schema.orders)
      .innerJoin(schema.tables, eq(schema.orders.tableId, schema.tables.id))
      .where(and(...conditions))
      .orderBy(desc(schema.orders.createdAt))
      .limit(pagination.limit)
      .offset(offset);
    
    return rows.map(row => ({
      ...transformDatabaseRowWithDecimals<Order>(row.order),
      table: transformDatabaseRow<Table>(row.table)
    }));
  },

  // Update order status
  updateOrderStatus: async (data: UpdateOrderStatusDto): Promise<Order | undefined> => {
    const { orderId, status } = data;
    const db = getDatabase();
    
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
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
    
    return updated ? transformDatabaseRowWithDecimals(updated) : undefined;
  },

  // Get active orders for kitchen with variants
  getActiveOrdersForKitchen: async (restaurantId: ID): Promise<OrderWithTable[]> => {
    const db = getDatabase();
    const rows = await db
      .select({
        order: schema.orders,
        table: schema.tables,
      })
      .from(schema.orders)
      .innerJoin(schema.tables, eq(schema.orders.tableId, schema.tables.id))
      .where(and(
        eq(schema.orders.restaurantId, restaurantId),
        inArray(schema.orders.status, ['pending', 'confirmed', 'preparing'])
      ))
      .orderBy(asc(schema.orders.createdAt));

    return rows.map(row => ({
      ...transformDatabaseRowWithDecimals<Order>(row.order),
      table: transformDatabaseRow<Table>(row.table)
    }))
  },
};

// Kitchen load queries
export const kitchenQueries = {
  // Get current kitchen load
  getKitchenLoad: async (restaurantId: ID): Promise<KitchenLoad | undefined> => {
    const db = getDatabase();
    const result = await db
      .select()
      .from(schema.kitchenLoads)
      .where(eq(schema.kitchenLoads.restaurantId, restaurantId))
      .orderBy(desc(schema.kitchenLoads.lastUpdated))
      .limit(1);
    
    return result[0] ? transformDatabaseRow(result[0]) : undefined;
  },

  // Update kitchen load
  updateKitchenLoad: async (restaurantId: ID, data: KitchenLoadInfo): Promise<KitchenLoad | undefined> => {
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
    
    return created ? transformDatabaseRow(created) : undefined;
  },

  // Calculate kitchen load from active orders
  calculateKitchenLoad: async (restaurantId: ID): Promise<KitchenLoadInfo> => {
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
  getOrderStats: async (restaurantId: ID, dateFrom: Date, dateTo: Date): Promise<OrderStats | undefined> => {
    const db = getDatabase();
    
    const [stats] = await db
      .select({
        totalOrders: count(),
        totalRevenue: sql<number>`SUM(CAST(${schema.orders.totalAmount} AS DECIMAL))`,
        averageOrderValue: sql<number>`AVG(CAST(${schema.orders.totalAmount} AS DECIMAL))`,
        completedOrders: sql<number>`COUNT(CASE WHEN ${schema.orders.status} = 'served' THEN 1 END)`,
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
  getPopularMenuItems: async (restaurantId: ID, dateFrom: Date, dateTo: Date, limit: number = 10): Promise<PopularItem[]> => {
    const db = getDatabase();
    
    const rows = await db
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

    return rows.map(row => ({
      ...row,
      menuItem: transformDatabaseRow<MenuItem>(row.menuItem),
      variant: transformDatabaseRow<MenuItemVariant>(row.variant),
    }))
  },

  // Get hourly order distribution
  getHourlyOrderDistribution: async (restaurantId: ID, date: Date): Promise<HourlyOrderDistribution[]>  => {
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
  menu: menuQueries,
  order: orderQueries,
  staff: staffQueries,
  telegramGroup: telegramGroupQueries,
  kitchen: kitchenQueries,
  analytics: analyticsQueries,
};
