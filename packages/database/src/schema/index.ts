import { 
  pgTable, 
  text, 
  integer, 
  decimal, 
  boolean, 
  timestamp, 
  uuid, 
  varchar,
  pgEnum,
  index,
  unique,
  bigint,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { GROUP_TYPES, ITEM_SIZES, ORDER_STATUS, SPICE_LEVELS, STAFF_ROLES } from '@dine-now/shared';

// Enums
export const orderStatusEnum = pgEnum('order_status', ORDER_STATUS);

export const spiceLevelEnum = pgEnum('spice_level', SPICE_LEVELS);

export const itemSizeEnum = pgEnum('item_size', ITEM_SIZES);

export const staffRoleEnum = pgEnum('staff_role', STAFF_ROLES);

export const telegramGroupEnum = pgEnum('telegram_group_type', GROUP_TYPES);

// Staff
export const staff = pgTable('staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  telegramId: bigint('telegram_id', { mode: 'bigint' }).notNull(),
  role: staffRoleEnum('role').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  restaurantTelegramUnique: unique('restaurant_telegram_unique').on(table.restaurantId, table.telegramId),
  restaurantIdx: index('staff_restaurant_idx').on(table.restaurantId),
  telegramIdx: index('staff_telegram_idx').on(table.telegramId),
  roleIdx: index('staff_role_idx').on(table.role),
}));

// Telegram groups 
export const telegramGroups = pgTable('telegram_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: bigint('chat_id', { mode: 'bigint' }).notNull(), // e.g. a single telegram group for all staff members 
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id),
  groupType: telegramGroupEnum('group_type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  restaurantTelegramUnique: unique('restaurant_telegram_group_unique').on(table.restaurantId, table.groupType),
  restaurantIdx: index('telegram_groups_restaurant_idx').on(table.restaurantId),
  chatIdx: index('telegram_groups_chat_idx').on(table.chatId),
}));

// Restaurants table
export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  nameKh: varchar('name_kh', { length: 100 }),
  description: text('description'),
  descriptionKh: text('description_kh'),
  address: text('address'),
  phoneNumber: varchar('phone_number', { length: 20 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('restaurants_name_idx').on(table.name),
  phoneIdx: index('restaurants_phone_idx').on(table.phoneNumber),
}));

// Tables
export const tables = pgTable('tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  number: varchar('number', { length: 10 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  restaurantTableUnique: unique('restaurant_table_unique').on(table.restaurantId, table.number),
  restaurantIdx: index('tables_restaurant_idx').on(table.restaurantId),
}));

// Menu categories
export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  nameKh: varchar('name_kh', { length: 100 }),
  description: text('description'),
  descriptionKh: text('description_kh'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  restaurantIdx: index('menu_categories_restaurant_idx').on(table.restaurantId),
  sortOrderIdx: index('menu_categories_sort_order_idx').on(table.restaurantId, table.sortOrder),
  nameIdx: index('menu_categories_name_idx').on(table.name),
}));

// Menu items
export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => menuCategories.id, { onDelete: 'cascade' }),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  nameKh: varchar('name_kh', { length: 100 }),
  description: text('description'),
  descriptionKh: text('description_kh'),
  imageUrl: text('image_url'),
  preparationTimeMinutes: integer('preparation_time_minutes').notNull().default(15),
  isAvailable: boolean('is_available').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index('menu_items_category_idx').on(table.categoryId),
  restaurantIdx: index('menu_items_restaurant_idx').on(table.restaurantId),
  availableIdx: index('menu_items_available_idx').on(table.isAvailable),
  nameIdx: index('menu_items_name_idx').on(table.name),
  sortOrderIdx: index('menu_items_sort_order_idx').on(table.categoryId, table.sortOrder),
}));

// Menu item variants - stores size-based pricing and availability
export const menuItemVariants = pgTable('menu_item_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuItemId: uuid('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  size: itemSizeEnum('size').notNull(),
  name: varchar('name', { length: 50 }), // Optional custom name for variant (e.g., "Regular", "Family Size")
  nameKh: varchar('name_kh', { length: 50 }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false), // Mark default size
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  menuItemSizeUnique: unique('menu_item_size_unique').on(table.menuItemId, table.size),
  menuItemIdx: index('menu_item_variants_menu_item_idx').on(table.menuItemId),
  sizeIdx: index('menu_item_variants_size_idx').on(table.size),
  priceIdx: index('menu_item_variants_price_idx').on(table.price),
  availableIdx: index('menu_item_variants_available_idx').on(table.isAvailable),
  defaultIdx: index('menu_item_variants_default_idx').on(table.isDefault),
  sortOrderIdx: index('menu_item_variants_sort_order_idx').on(table.menuItemId, table.sortOrder),
}));

// Orders - now directly references telegramId instead of customer
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerTelegramId: bigint('customer_telegram_id', { mode: 'bigint' }).notNull(), // Direct telegram ID reference
  customerName: varchar('customer_name', { length: 100 }).notNull(), // Store for display purposes
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id),
  tableId: uuid('table_id').notNull().references(() => tables.id),
  orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
  status: orderStatusEnum('status').notNull().default('pending'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  estimatedPreparationMinutes: integer('estimated_preparation_minutes').notNull(),
  actualPreparationMinutes: integer('actual_preparation_minutes'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at'),
  readyAt: timestamp('ready_at'),
  servedAt: timestamp('served_at'),
}, (table) => ({
  customerTelegramIdx: index('orders_customer_telegram_idx').on(table.customerTelegramId),
  restaurantIdx: index('orders_restaurant_idx').on(table.restaurantId),
  tableIdx: index('orders_table_idx').on(table.tableId),
  statusIdx: index('orders_status_idx').on(table.status),
  orderNumberIdx: index('orders_order_number_idx').on(table.orderNumber),
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  statusRestaurantIdx: index('orders_status_restaurant_idx').on(table.status, table.restaurantId),
}));

// Order items - now references menu item variants
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: uuid('menu_item_id').notNull().references(() => menuItems.id),
  variantId: uuid('variant_id').notNull().references(() => menuItemVariants.id), // Reference to specific variant
  quantity: integer('quantity').notNull().default(1),
  spiceLevel: spiceLevelEnum('spice_level').default('none'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
}, (table) => ({
  orderIdx: index('order_items_order_idx').on(table.orderId),
  menuItemIdx: index('order_items_menu_item_idx').on(table.menuItemId),
}));

// Relations
export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  staff: many(staff),
  telegramGroups: many(telegramGroups),
  tables: many(tables),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  orders: many(orders),
}));

export const telegramGroupsRelations = relations(telegramGroups, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [telegramGroups.restaurantId],
    references: [restaurants.id],
  }),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [tables.restaurantId],
    references: [restaurants.id],
  }),
  orders: many(orders),
}));

export const staffRelations = relations(staff, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [staff.restaurantId],
    references: [restaurants.id],
  }),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [menuCategories.restaurantId],
    references: [restaurants.id],
  }),
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  restaurant: one(restaurants, {
    fields: [menuItems.restaurantId],
    references: [restaurants.id],
  }),
  variants: many(menuItemVariants),
  orderItems: many(orderItems),
}));

export const menuItemVariantsRelations = relations(menuItemVariants, ({ one, many }) => ({
  menuItem: one(menuItems, {
    fields: [menuItemVariants.menuItemId],
    references: [menuItems.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
  variant: one(menuItemVariants, {
    fields: [orderItems.variantId],
    references: [menuItemVariants.id],
  }),
}));

// Export all tables for migrations
export const schema = {
  staff,
  restaurants,
  telegramGroups,
  tables,
  menuCategories,
  menuItems,
  menuItemVariants,
  orders,
  orderItems,
  // Relations
  restaurantsRelations,
  tablesRelations,
  staffRelations,
  telegramGroupsRelations,
  menuCategoriesRelations,
  menuItemsRelations,
  menuItemVariantsRelations,
  ordersRelations,
  orderItemsRelations,
};
