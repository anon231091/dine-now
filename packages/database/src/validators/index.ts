import { createSchemaFactory } from 'drizzle-zod';
import { z } from 'zod/v4';
import {
  restaurants, tables, staff, menuCategories, menuItems, menuItemVariants,
  itemSizeEnum, telegramGroups, orders, orderItems, staffRoleEnum,
  orderStatusEnum
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
const { createInsertSchema } = createSchemaFactory({
  zodInstance: z,
  // This configuration will only coerce dates. Set `coerce` to `true` to coerce all data types or specify others
  coerce: {
    date: true,
    bigint: true
  },
});

// Staff API schemas
const RegisterStaffSchema = createInsertSchema(staff, {
  restaurantId: IdSchema,
  telegramId: TelegramIdSchema
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
const UpdateStaffSchema = RegisterStaffSchema.partial().omit({ 
  restaurantId: true, 
  isActive: true,
});

// Telegram Group schemas
const RegisterTelegramGroupSchema = createInsertSchema(telegramGroups, {
  restaurantId: IdSchema,
  chatId: TelegramIdSchema,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const UpdateTelegramGroupSchema = RegisterTelegramGroupSchema.partial().omit({ 
  restaurantId: true, 
  isActive: true
});

// Restaurant API schemas
const RegisterRestaurantSchema = createInsertSchema(restaurants, {
  phoneNumber: PhoneNumberSchema.optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
const UpdateRestaurantSchema = RegisterRestaurantSchema.partial().omit({
  isActive: true,
});

// Table API schemas
const RegisterTableSchema = createInsertSchema(tables, {
  number: TableNumberSchema
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
const UpdateTableSchema = RegisterTableSchema.partial().omit({
  restaurantId: true,
  isActive: true
});

// Menu Category API schemas
const RegisterMenuCategorySchema = createInsertSchema(menuCategories, {
  restaurantId: IdSchema,
  sortOrder: SortOrderSchema
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
const UpdateMenuCategorySchema = RegisterMenuCategorySchema.partial().omit({ 
  restaurantId: true,
  isActive: true
});

// Menu Item Variant API schemas
const RegisterMenuItemVariantSchema = createInsertSchema(menuItemVariants, {
  menuItemId: IdSchema,
  price: PriceSchema,
  sortOrder: SortOrderSchema
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const UpdateMenuItemVariantSchema = RegisterMenuItemVariantSchema.partial().omit({ 
  menuItemId: true,
  isAvailable: true
});

// Menu Item API schemas
const RegisterMenuItemSchema = createInsertSchema(menuItems, {
  categoryId: IdSchema,
  restaurantId: IdSchema,
  sortOrder: SortOrderSchema,
  imageUrl: z.url('Invalid image URL').optional(),
  preparationTimeMinutes: (schema) => schema
    .min(BUSINESS_RULES.MIN_PREPARATION_TIME)
    .max(BUSINESS_RULES.MAX_PREPARATION_TIME)
    .default(BUSINESS_RULES.DEFAULT_PREPARATION_TIME),
}).extend({
  variants: z
    .array(RegisterMenuItemVariantSchema.omit({ menuItemId: true }))
    .min(1, 'At least one variant is required')
    .max(BUSINESS_RULES.MAX_VARIANTS_PER_ITEM),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
const UpdateMenuItemSchema = RegisterMenuItemSchema.partial().omit({ 
  restaurantId: true,
  isActive: true,
  isAvailable: true,
  variants: true
});

// Order Item schema for order creation
const OrderItemInputSchema = createInsertSchema(orderItems, {
  menuItemId: IdSchema,
  variantId: IdSchema,
  quantity: (schema) => schema.min(1).max(BUSINESS_RULES.MAX_PER_ITEM),
})
.omit({
  id: true,
  orderId: true
});

const OrderDataSchema = createInsertSchema(orders, {
  customerTelegramId: TelegramIdSchema,
  restaurantId: IdSchema,
  tableId: IdSchema,
  orderNumber: OrderNumberSchema,
  totalAmount: PriceSchema,
  notes: (schema) => schema.max(200).optional(),
})
.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  confirmedAt: true,
  readyAt: true,
  servedAt: true
})
.extend({
  orderItems: z
    .array(OrderItemInputSchema)
    .min(BUSINESS_RULES.MIN_ORDER_VALUE, 'At least one item is required')
    .max(BUSINESS_RULES.MAX_ITEMS_PER_ORDER),
});

// Order API schemas
const CreateOrderSchema = createInsertSchema(orders, {
  tableId: IdSchema,
  notes: (schema) => schema.max(200).optional(),
}).pick({
  tableId: true,
  notes: true
}).extend({
  orderItems: z
    .array(OrderItemInputSchema.omit({ subtotal: true }))
    .min(BUSINESS_RULES.MIN_ORDER_VALUE, 'At least one item is required')
    .max(BUSINESS_RULES.MAX_ITEMS_PER_ORDER),
})

const UpdateOrderStatusSchema = z.object({
  status: z.enum(orderStatusEnum.enumValues),
  notes: z.string().max(500).optional(),
});

// Search and filter schemas
const StaffQuerySchema = z.object({
  role: z.enum(staffRoleEnum.enumValues).optional(),
});

const MenuSearchSchema = z.object({
  categoryId: IdSchema.optional(),
  search: z.string().max(100).optional(),
  isAvailable: z.boolean().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  size: z.enum(itemSizeEnum.enumValues).optional(),
  sortBy: z.enum(['name', 'price', 'preparationTime', 'sortOrder']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  pagination: PaginationSchema.optional(),
});

const OrderSearchSchema = z.object({
  customerId: IdSchema.optional(),
  status: z.array(z.enum(orderStatusEnum.enumValues)).optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  sortBy: z.enum(['createdAt', 'totalAmount', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  pagination: PaginationSchema.optional(),
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
const TelegramIdParamsSchema = z.object({
  telegramId: TelegramIdSchema,
});

const StaffParamsSchema = z.object({
  staffId: IdSchema,
});

const TelegramGroupParamsSchema = z.object({
  groupId: IdSchema,
});

const RestaurantParamsSchema = z.object({
  restaurantId: IdSchema,
});

const TableParamsSchema = z.object({
  tableId: IdSchema,
});

const OrderParamsSchema = z.object({
  orderId: IdSchema,
});

const CategoryParamsSchema = z.object({
  categoryId: IdSchema,
});

const MenuItemParamsSchema = z.object({
  itemId: IdSchema,
});

const VariantParamsSchema = z.object({
  variantId: IdSchema.optional(),
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
  TelegramIdParams: TelegramIdParamsSchema,
  StaffParams: StaffParamsSchema,
  TelegramGroupParams: TelegramGroupParamsSchema,
  RestaurantParams: RestaurantParamsSchema,
  TableParams: TableParamsSchema,
  CategoryParams: CategoryParamsSchema,
  MenuItemParams: MenuItemParamsSchema,
  VariantParams: VariantParamsSchema,
  OrderParams: OrderParamsSchema,

  // DTO schema
  RegisterRestaurant: RegisterRestaurantSchema,
  UpdateRestaurant: UpdateRestaurantSchema,
  
  RegisterTable: RegisterTableSchema,
  UpdateTable: UpdateTableSchema,
  
  RegisterStaff: RegisterStaffSchema,
  UpdateStaff: UpdateStaffSchema,

  RegisterTelegramGroup: RegisterTelegramGroupSchema,
  UpdateTelegramGroup: UpdateTelegramGroupSchema,
  
  RegisterMenuCategory: RegisterMenuCategorySchema,
  UpdateMenuCategory: UpdateMenuCategorySchema,
  
  RegisterMenuItem: RegisterMenuItemSchema,
  UpdateMenuItem: UpdateMenuItemSchema,
  
  RegisterMenuItemVariant: RegisterMenuItemVariantSchema,
  UpdateMenuItemVariant: UpdateMenuItemVariantSchema,
  
  OrderItem: OrderItemInputSchema,
  OrderData: OrderDataSchema,
  CreateOrder: CreateOrderSchema,
  UpdateOrderStatus: UpdateOrderStatusSchema,
  
  StaffQuery: StaffQuerySchema,
  MenuSearch: MenuSearchSchema,
  OrderSearch: OrderSearchSchema,
  
  ImageUpload: ImageUploadSchema,
  AnalyticsQuery: AnalyticsQuerySchema,
} as const;
