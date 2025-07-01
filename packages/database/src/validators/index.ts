import { createSchemaFactory } from 'drizzle-zod';
import { z } from 'zod/v4';
import {
  restaurants, tables, staff, menuCategories, menuItems, menuItemVariants,
  orderStatusEnum, itemSizeEnum, telegramGroups, orders, orderItems,
  kitchenLoads
} from '../schema';
import { BUSINESS_RULES, REGEX } from '@dine-now/shared';

// Common schemas
const IdSchema = z.string().min(1, 'ID is required');
const TelegramIdSchema = z.union([
  z.number().int().positive('Invalid Telegram ID'),
  z.bigint().positive('Invalid Telegram ID'),
  z.string().transform((val) => BigInt(val))
]).transform((val) => typeof val === 'bigint' ? val : BigInt(val));
const PhoneNumberSchema = z
  .string()
  .regex(REGEX.PHONE_KH, 'Invalid Cambodia phone number format');
const PriceSchema = z.union([
  z.string().regex(REGEX.PRICE, 'Invalid price format'),
  z.number().min(0, 'Price must be positive').transform(String)
]);
const TableNumberSchema = z.union([
  z.string().min(1, 'Table number is required'),
  z.number().positive('Invalid table number').transform(String)
]);
const SortOrderSchema = z.number().int().min(0, "Sort order must be non-negative");
const OrderNumberSchema = z.string().regex(REGEX.ORDER_NUMBER, 'Invalid order number format');

const PaginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(BUSINESS_RULES.MAX_PAGE_SIZE, `Limit cannot exceed ${BUSINESS_RULES.MAX_PAGE_SIZE}`)
    .default(BUSINESS_RULES.DEFAULT_PAGE_SIZE),
});

// API Request Schemas (enhanced versions of insert schemas)
const { createInsertSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
  // This configuration will only coerce dates. Set `coerce` to `true` to coerce all data types or specify others
  coerce: {
    date: true,
    bigint: true
  }
});

// Staff API schemas
const CreateStaffSchema = createInsertSchema(staff, {
  restaurantId: IdSchema,
  telegramId: TelegramIdSchema
});
const UpdateStaffSchema = CreateStaffSchema.partial().omit({ 
  restaurantId: true, 
  telegramId: true
});

// Telegram Group schemas
const CreateTelegramGroupSchema = createInsertSchema(telegramGroups, {
  restaurantId: IdSchema,
  chatId: TelegramIdSchema,
});

const UpdateTelegramGroupSchema = CreateTelegramGroupSchema.partial().omit({ 
  restaurantId: true, 
  chatId: true
});

// Restaurant API schemas
const CreateRestaurantSchema = createInsertSchema(restaurants, {
  phoneNumber: PhoneNumberSchema.optional()
});
const UpdateRestaurantSchema = CreateRestaurantSchema.partial();

// Table API schemas
const CreateTableSchema = createInsertSchema(tables, {
  restaurantId: IdSchema,
  number: TableNumberSchema
});
const UpdateTableSchema = CreateTableSchema.partial().omit({ restaurantId: true });

// Menu Category API schemas
const CreateMenuCategorySchema = createInsertSchema(menuCategories, {
  restaurantId: IdSchema,
  sortOrder: SortOrderSchema
});
const UpdateMenuCategorySchema = CreateMenuCategorySchema.partial().omit({ 
  restaurantId: true 
});

// Menu Item API schemas
const CreateMenuItemSchema = createInsertSchema(menuItems, {
  categoryId: IdSchema,
  restaurantId: IdSchema,
  sortOrder: SortOrderSchema,
  imageUrl: z.url('Invalid image URL').optional(),
  preparationTimeMinutes: (schema) => schema
    .min(BUSINESS_RULES.MIN_PREPARATION_TIME)
    .max(BUSINESS_RULES.MAX_PREPARATION_TIME)
    .default(BUSINESS_RULES.DEFAULT_PREPARATION_TIME),
});
const UpdateMenuItemSchema = CreateMenuItemSchema.partial().omit({ 
  restaurantId: true 
});

// Menu Item Variant API schemas
const CreateMenuItemVariantSchema = createInsertSchema(menuItemVariants, {
  menuItemId: IdSchema,
  price: PriceSchema,
  sortOrder: SortOrderSchema
});

const UpdateMenuItemVariantSchema = CreateMenuItemVariantSchema.partial().omit({ 
  menuItemId: true 
});

// Order Item schema for order creation
const OrderItemInputSchema = createInsertSchema(orderItems, {
  menuItemId: IdSchema,
  variantId: IdSchema,
  quantity: (schema) => schema.min(1).max(BUSINESS_RULES.MAX_PER_ITEM),
  notes: (schema) => schema.max(200).optional(),
})
.omit({
  orderId: true,
  subtotal: true
});

// Order API schemas
const CreateOrderSchema = createInsertSchema(orders, {
  restaurantId: IdSchema,
  tableId: IdSchema,
  customerTelegramId: TelegramIdSchema,
  orderNumber: OrderNumberSchema,
  totalAmount: PriceSchema,
  notes: (schema) => schema.max(500).optional(),
}).extend({
  orderItems: z
    .array(OrderItemInputSchema)
    .min(BUSINESS_RULES.MIN_ORDER_VALUE, 'At least one item is required')
    .max(BUSINESS_RULES.MAX_ITEMS_PER_ORDER),
});

const UpdateOrderStatusSchema = z.object({
  status: z.enum(orderStatusEnum.enumValues),
  notes: z.string().max(500).optional(),
});

// Kitchen Load API schemas
const UpdateKitchenLoadSchema = createUpdateSchema(kitchenLoads, {
  restaurantId: IdSchema,
  currentOrders: (schema) => schema.min(0),
  averagePreparationTime: (schema) => schema.min(0),
});

// Search and filter schemas
const MenuSearchSchema = z.object({
  restaurantId: IdSchema,
  categoryId: IdSchema.optional(),
  search: z.string().max(100).optional(),
  isAvailable: z.boolean().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  size: z.enum(itemSizeEnum.enumValues).optional(),
  sortBy: z.enum(['name', 'price', 'preparationTime', 'sortOrder']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  ...PaginationSchema.shape
});

const OrderSearchSchema = z.object({
  restaurantId: IdSchema.optional(),
  customerId: IdSchema.optional(),
  tableId: IdSchema.optional(),
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled']).optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  sortBy: z.enum(['createdAt', 'totalAmount', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  ...PaginationSchema.shape
});

// File upload schemas
const ImageUploadSchema = z.object({
  file: z.object({
    size: z.number().max(BUSINESS_RULES.MAX_IMAGE_SIZE, 'File size too large'),
    type: z.enum(['image/jpeg', 'image/png', 'image/webp'] as const, ""),
  }),
});

// Analytics schemas
const AnalyticsQuerySchema = z.object({
  restaurantId: IdSchema,
  dateFrom: z.iso.datetime(),
  dateTo: z.iso.datetime(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

// Validation middleware helper
export const validateSchema = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  };
};

// Parameter validation schemas for routes
const RestaurantParamsSchema = z.object({
  restaurantId: IdSchema,
});

const TableParamsSchema = z.object({
  tableId: IdSchema,
});

const OrderParamsSchema = z.object({
  orderId: IdSchema,
});

const MenuItemParamsSchema = z.object({
  itemId: IdSchema,
});

const VariantParamsSchema = z.object({
  variantId: IdSchema,
});

// Export all schemas for easy access
export const validators = {
  // Base schema
  Id: IdSchema,
  TelegramId: TelegramIdSchema,
  PhoneNumber: PhoneNumberSchema,
  OrderNumber: OrderNumberSchema,
  Pagination: PaginationSchema,
  
  // Parameter schemas
  RestaurantParams: RestaurantParamsSchema,
  TableParams: TableParamsSchema,
  OrderParams: OrderParamsSchema,
  MenuItemParams: MenuItemParamsSchema,
  VariantParams: VariantParamsSchema,

  // DTO schema
  CreateRestaurant: CreateRestaurantSchema,
  UpdateRestaurant: UpdateRestaurantSchema,
  
  CreateTable: CreateTableSchema,
  UpdateTable: UpdateTableSchema,
  
  CreateStaff: CreateStaffSchema,
  UpdateStaff: UpdateStaffSchema,

  CreateTelegramGroup: CreateTelegramGroupSchema,
  UpdateTelegramGroup: UpdateTelegramGroupSchema,
  
  CreateMenuCategory: CreateMenuCategorySchema,
  UpdateMenuCategory: UpdateMenuCategorySchema,
  
  CreateMenuItem: CreateMenuItemSchema,
  UpdateMenuItem: UpdateMenuItemSchema,
  
  CreateMenuItemVariant: CreateMenuItemVariantSchema,
  UpdateMenuItemVariant: UpdateMenuItemVariantSchema,
  
  OrderItem: OrderItemInputSchema,
  CreateOrder: CreateOrderSchema,
  UpdateOrderStatus: UpdateOrderStatusSchema,
  
  UpdateKitchenLoad: UpdateKitchenLoadSchema,
  
  MenuSearch: MenuSearchSchema,
  OrderSearch: OrderSearchSchema,
  
  ImageUpload: ImageUploadSchema,
  AnalyticsQuery: AnalyticsQuerySchema,
} as const;
