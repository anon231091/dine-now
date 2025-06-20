import { z } from 'zod';
import { OrderStatus, SpiceLevel, ItemSize, StaffRole } from '../types';
import { BUSINESS_RULES, REGEX } from '../constants';

// Base schemas
export const IdSchema = z.string().min(1, 'ID is required');

export const TelegramIdSchema = z.number().int().positive('Invalid Telegram ID');

export const PhoneNumberSchema = z
  .string()
  .regex(REGEX.PHONE_KH, 'Invalid Cambodia phone number format');

export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .optional();

export const PaginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(BUSINESS_RULES.MAX_PAGE_SIZE, `Limit cannot exceed ${BUSINESS_RULES.MAX_PAGE_SIZE}`)
    .default(BUSINESS_RULES.DEFAULT_PAGE_SIZE),
});

// Customer schemas
export const CreateCustomerSchema = z.object({
  telegramId: TelegramIdSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().max(50, 'Last name too long').optional(),
  username: z.string().max(50, 'Username too long').optional(),
  phoneNumber: PhoneNumberSchema.optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial().omit({ telegramId: true });

// Restaurant schemas
export const CreateRestaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  address: z.string().min(1, 'Address is required').max(200, 'Address too long'),
  phoneNumber: PhoneNumberSchema,
});

export const UpdateRestaurantSchema = CreateRestaurantSchema.partial();

// Table schemas
export const CreateTableSchema = z.object({
  restaurantId: IdSchema,
  number: z.string().min(1, 'Table number is required').max(10, 'Table number too long'),
});

export const UpdateTableSchema = CreateTableSchema.partial().omit({ restaurantId: true });

// Menu category schemas
export const CreateMenuCategorySchema = z.object({
  restaurantId: IdSchema,
  name: z.string().min(1, 'Category name is required').max(100, 'Name too long'),
  nameKh: z.string().max(100, 'Khmer name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  descriptionKh: z.string().max(500, 'Khmer description too long').optional(),
  sortOrder: z.number().int().min(0, 'Sort order must be non-negative').default(0),
});

export const UpdateMenuCategorySchema = CreateMenuCategorySchema.partial().omit({ restaurantId: true });

// Menu item schemas
export const CreateMenuItemSchema = z.object({
  categoryId: IdSchema,
  restaurantId: IdSchema,
  name: z.string().min(1, 'Item name is required').max(100, 'Name too long'),
  nameKh: z.string().max(100, 'Khmer name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  descriptionKh: z.string().max(500, 'Khmer description too long').optional(),
  price: z.number().min(0.01, 'Price must be greater than 0').max(BUSINESS_RULES.MAX_ORDER_VALUE, 'Price too high'),
  imageUrl: z.string().url('Invalid image URL').optional(),
  preparationTimeMinutes: z
    .number()
    .int()
    .min(BUSINESS_RULES.MIN_PREPARATION_TIME, `Preparation time must be at least ${BUSINESS_RULES.MIN_PREPARATION_TIME} minutes`)
    .max(BUSINESS_RULES.MAX_PREPARATION_TIME, `Preparation time cannot exceed ${BUSINESS_RULES.MAX_PREPARATION_TIME} minutes`)
    .default(BUSINESS_RULES.DEFAULT_PREPARATION_TIME),
  sortOrder: z.number().int().min(0, 'Sort order must be non-negative').default(0),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial().omit({ restaurantId: true });

// Order item schemas
export const OrderItemSchema = z.object({
  menuItemId: IdSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Quantity too high'),
  size: z.nativeEnum(ItemSize).optional(),
  spiceLevel: z.nativeEnum(SpiceLevel).optional(),
  notes: z.string().max(200, 'Notes too long').optional(),
});

// Order schemas
export const CreateOrderSchema = z.object({
  tableId: IdSchema,
  customerId: IdSchema,
  orderItems: z
    .array(OrderItemSchema)
    .min(1, 'At least one item is required')
    .max(BUSINESS_RULES.MAX_ITEMS_PER_ORDER, `Cannot order more than ${BUSINESS_RULES.MAX_ITEMS_PER_ORDER} items`),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const UpdateOrderStatusSchema = z.object({
  orderId: IdSchema,
  status: z.nativeEnum(OrderStatus),
  notes: z.string().max(500, 'Notes too long').optional(),
});

// Staff schemas
export const CreateStaffSchema = z.object({
  restaurantId: IdSchema,
  telegramId: TelegramIdSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().max(50, 'Last name too long').optional(),
  username: z.string().max(50, 'Username too long').optional(),
  role: z.nativeEnum(StaffRole),
});

export const UpdateStaffSchema = CreateStaffSchema.partial().omit({ restaurantId: true, telegramId: true });

// Kitchen load schema
export const UpdateKitchenLoadSchema = z.object({
  restaurantId: IdSchema,
  currentOrders: z.number().int().min(0, 'Current orders cannot be negative'),
  averagePreparationTime: z.number().min(0, 'Average preparation time cannot be negative'),
});

// Search and filter schemas
export const MenuSearchSchema = z.object({
  restaurantId: IdSchema,
  categoryId: IdSchema.optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  isAvailable: z.boolean().optional(),
  minPrice: z.number().min(0, 'Minimum price cannot be negative').optional(),
  maxPrice: z.number().min(0, 'Maximum price cannot be negative').optional(),
  sortBy: z.enum(['name', 'price', 'preparationTime', 'sortOrder']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
}).merge(PaginationSchema);

export const OrderSearchSchema = z.object({
  restaurantId: IdSchema.optional(),
  customerId: IdSchema.optional(),
  tableId: IdSchema.optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'totalAmount', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).merge(PaginationSchema);

// File upload schemas
export const ImageUploadSchema = z.object({
  file: z.object({
    size: z.number().max(BUSINESS_RULES.MAX_IMAGE_SIZE, 'File size too large'),
    type: z.enum(['image/jpeg', 'image/png', 'image/webp'] as const, {
      errorMap: () => ({ message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }),
    }),
  }),
});

// WebSocket schemas
export const JoinRoomSchema = z.object({
  room: z.string().min(1, 'Room name is required'),
  userId: IdSchema,
  userType: z.enum(['customer', 'staff']),
});

export const LeaveRoomSchema = z.object({
  room: z.string().min(1, 'Room name is required'),
});

// QR Code schemas
export const QRCodeDataSchema = z.object({
  tableId: IdSchema,
  restaurantId: IdSchema,
});

// Telegram webhook schemas
export const TelegramUpdateSchema = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number(),
    from: z.object({
      id: z.number(),
      is_bot: z.boolean(),
      first_name: z.string(),
      last_name: z.string().optional(),
      username: z.string().optional(),
    }),
    chat: z.object({
      id: z.number(),
      type: z.string(),
    }),
    date: z.number(),
    text: z.string().optional(),
  }).optional(),
  callback_query: z.object({
    id: z.string(),
    from: z.object({
      id: z.number(),
      is_bot: z.boolean(),
      first_name: z.string(),
      last_name: z.string().optional(),
      username: z.string().optional(),
    }),
    message: z.object({
      message_id: z.number(),
      chat: z.object({
        id: z.number(),
        type: z.string(),
      }),
    }),
    data: z.string(),
  }).optional(),
});

// Analytics schemas
export const AnalyticsQuerySchema = z.object({
  restaurantId: IdSchema,
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

// Validation helper functions
export const validateId = (id: string): boolean => {
  return IdSchema.safeParse(id).success;
};

export const validateEmail = (email: string): boolean => {
  return EmailSchema.safeParse(email).success;
};

export const validatePhoneNumber = (phone: string): boolean => {
  return PhoneNumberSchema.safeParse(phone).success;
};

export const validateOrderNumber = (orderNumber: string): boolean => {
  return REGEX.ORDER_NUMBER.test(orderNumber);
};

export const validateQRCode = (qrCode: string): boolean => {
  return REGEX.TABLE_QR.test(qrCode);
};

// Custom validation errors
export class ValidationError extends Error {
  public errors: z.ZodError['errors'];

  constructor(zodError: z.ZodError) {
    const message = zodError.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    super(`Validation failed: ${message}`);
    this.errors = zodError.errors;
    this.name = 'ValidationError';
  }
}

// Validation middleware helper
export const validateSchema = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(result.error);
    }
    return result.data;
  };
};

// Export all schemas for easy access
export const schemas = {
  // Base
  Id: IdSchema,
  TelegramId: TelegramIdSchema,
  PhoneNumber: PhoneNumberSchema,
  Email: EmailSchema,
  Pagination: PaginationSchema,
  
  // Customer
  CreateCustomer: CreateCustomerSchema,
  UpdateCustomer: UpdateCustomerSchema,
  
  // Restaurant
  CreateRestaurant: CreateRestaurantSchema,
  UpdateRestaurant: UpdateRestaurantSchema,
  
  // Table
  CreateTable: CreateTableSchema,
  UpdateTable: UpdateTableSchema,
  
  // Menu
  CreateMenuCategory: CreateMenuCategorySchema,
  UpdateMenuCategory: UpdateMenuCategorySchema,
  CreateMenuItem: CreateMenuItemSchema,
  UpdateMenuItem: UpdateMenuItemSchema,
  
  // Order
  OrderItem: OrderItemSchema,
  CreateOrder: CreateOrderSchema,
  UpdateOrderStatus: UpdateOrderStatusSchema,
  
  // Staff
  CreateStaff: CreateStaffSchema,
  UpdateStaff: UpdateStaffSchema,
  
  // Kitchen
  UpdateKitchenLoad: UpdateKitchenLoadSchema,
  
  // Search
  MenuSearch: MenuSearchSchema,
  OrderSearch: OrderSearchSchema,
  
  // File upload
  ImageUpload: ImageUploadSchema,
  
  // WebSocket
  JoinRoom: JoinRoomSchema,
  LeaveRoom: LeaveRoomSchema,
  
  // QR Code
  QRCodeData: QRCodeDataSchema,
  
  // Telegram
  TelegramUpdate: TelegramUpdateSchema,
  
  // Analytics
  AnalyticsQuery: AnalyticsQuerySchema,
} as const;
