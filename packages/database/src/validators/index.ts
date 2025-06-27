import { createSchemaFactory } from 'drizzle-zod';
import { z } from 'zod/v4';
import { restaurants, tables, staff, menuCategories, menuItems, menuItemVariants, orderStatusEnum, spiceLevelEnum, itemSizeEnum } from '../schema';
import { BUSINESS_RULES, REGEX } from '@dine-now/shared';

// Common schemas
export const IdSchema = z.string().min(1, 'ID is required');
export const TelegramIdSchema = z.number().int().positive('Invalid Telegram ID');
export const PhoneNumberSchema = z
  .string()
  .regex(REGEX.PHONE_KH, 'Invalid Cambodia phone number format');
export const PriceSchema = z
  .string()
  .regex(REGEX.PRICE, 'Invalid price format');
export const SortOrderSchema = z.number().int().min(0, "Sort order must be non-negative");

export const PaginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(BUSINESS_RULES.MAX_PAGE_SIZE, `Limit cannot exceed ${BUSINESS_RULES.MAX_PAGE_SIZE}`)
    .default(BUSINESS_RULES.DEFAULT_PAGE_SIZE),
});

// API Request Schemas (enhanced versions of insert schemas)
const { createInsertSchema } = createSchemaFactory({
  zodInstance: z,
  // This configuration will only coerce dates. Set `coerce` to `true` to coerce all data types or specify others
  coerce: {
    date: true
  }
});

// Staff API schemas
export const CreateStaffSchema = createInsertSchema(staff, {
  restaurantId: IdSchema,
  telegramId: TelegramIdSchema
});
export const UpdateStaffSchema = CreateStaffSchema.partial().omit({ 
  restaurantId: true, 
  telegramId: true 
});

// Restaurant API schemas
export const CreateRestaurantSchema = createInsertSchema(restaurants, { phoneNumber: PhoneNumberSchema });
export const UpdateRestaurantSchema = CreateRestaurantSchema.partial();

// Table API schemas
export const CreateTableSchema = createInsertSchema(tables, { restaurantId: IdSchema });
export const UpdateTableSchema = CreateTableSchema.partial().omit({ restaurantId: true });

// Menu Category API schemas
export const CreateMenuCategorySchema = createInsertSchema(menuCategories, {
  restaurantId: IdSchema,
  sortOrder: SortOrderSchema
});
export const UpdateMenuCategorySchema = CreateMenuCategorySchema.partial().omit({ 
  restaurantId: true 
});

// Menu Item API schemas
export const CreateMenuItemSchema = createInsertSchema(menuItems, {
  categoryId: IdSchema,
  restaurantId: IdSchema,
  sortOrder: SortOrderSchema,
  imageUrl: z.url('Invalid image URL').optional(),
  preparationTimeMinutes: (schema) => schema
    .min(BUSINESS_RULES.MIN_PREPARATION_TIME)
    .max(BUSINESS_RULES.MAX_PREPARATION_TIME)
    .default(BUSINESS_RULES.DEFAULT_PREPARATION_TIME),
});
export const UpdateMenuItemSchema = CreateMenuItemSchema.partial().omit({ 
  restaurantId: true 
});

// Menu Item Variant API schemas
export const CreateMenuItemVariantSchema = createInsertSchema(menuItemVariants, {
  menuItemId: IdSchema,
  price: PriceSchema,
  sortOrder: SortOrderSchema
});

export const UpdateMenuItemVariantSchema = CreateMenuItemVariantSchema.partial().omit({ 
  menuItemId: true 
});

// Order Item schema for order creation
export const OrderItemInputSchema = z.object({
  menuItemId: IdSchema,
  variantId: IdSchema,
  quantity: z.number().int().min(1).max(50),
  spiceLevel: z.enum(spiceLevelEnum.enumValues).optional(),
  notes: z.string().max(200).optional(),
});

// Order API schemas
export const CreateOrderSchema = z.object({
  tableId: IdSchema,
  customerTelegramId: TelegramIdSchema,
  orderItems: z
    .array(OrderItemInputSchema)
    .min(1, 'At least one item is required')
    .max(BUSINESS_RULES.MAX_ITEMS_PER_ORDER),
  notes: z.string().max(500).optional(),
});

export const UpdateOrderStatusSchema = z.object({
  orderId: IdSchema,
  status: z.enum(orderStatusEnum.enumValues),
  notes: z.string().max(500).optional(),
});

// Kitchen Load API schemas
export const UpdateKitchenLoadSchema = z.object({
  restaurantId: IdSchema,
  currentOrders: z.number().int().min(0),
  averagePreparationTime: z.number().min(0),
});

// Search and filter schemas
export const MenuSearchSchema = z.object({
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

export const OrderSearchSchema = z.object({
  restaurantId: IdSchema.optional(),
  customerId: IdSchema.optional(),
  tableId: IdSchema.optional(),
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled']).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  sortBy: z.enum(['createdAt', 'totalAmount', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  ...PaginationSchema.shape
});

// File upload schemas
export const ImageUploadSchema = z.object({
  file: z.object({
    size: z.number().max(BUSINESS_RULES.MAX_IMAGE_SIZE, 'File size too large'),
    type: z.enum(['image/jpeg', 'image/png', 'image/webp'] as const, ""),
  }),
});

// Analytics schemas
export const AnalyticsQuerySchema = z.object({
  restaurantId: IdSchema,
  dateFrom: z.date(),
  dateTo: z.date(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

// Validation helper functions
export const validatePhoneNumber = (phone: string): boolean => {
  return PhoneNumberSchema.safeParse(phone).success;
};

export const validateOrderNumber = (orderNumber: string): boolean => {
  return REGEX.ORDER_NUMBER.test(orderNumber);
};

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

// Export all schemas for easy access
export const validators = {
  Id: IdSchema,
  TelegramId: TelegramIdSchema,
  PhoneNumber: PhoneNumberSchema,
  Pagination: PaginationSchema,
  
  CreateRestaurant: CreateRestaurantSchema,
  UpdateRestaurant: UpdateRestaurantSchema,
  
  CreateTable: CreateTableSchema,
  UpdateTable: UpdateTableSchema,
  
  CreateStaff: CreateStaffSchema,
  UpdateStaff: UpdateStaffSchema,
  
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
