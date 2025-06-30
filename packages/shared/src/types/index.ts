import { ERROR_MESSAGES, HTTP_STATUS, SERVICE_PERMISSIONS } from "../constants";

// Base types
export type ID = string;
export type Timestamp = Date;

export enum UserType {
  General = 'general',
  Staff = 'staff'
};

// Staff roles with clear hierarchy
export enum StaffRole {
  ADMIN = 'admin',            // Restaurant owner
  MANAGER = 'manager',        // Restaurant manager
  KITCHEN = 'kitchen',        // Kitchen staff
  SERVICE = 'service'         // Service staff
}

export enum GroupType {
  MANAGEMENT = 'management',
  KITCHEN = 'kitchen',
  SERVICE = 'service'
}

// Order types
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled'
}

export enum SpiceLevel {
  NONE = 'none',
  REGULAR = 'regular',
  SPICY = 'spicy',
  VERY_SPICY = 'very_spicy'
}

export enum ItemSize {
  SMALL = 'small',
  REGULAR = 'regular',
  LARGE = 'large'
}

// Restaurant structure
export interface Restaurant {
  id: ID;
  name: string;
  nameKh?: string;
  description?: string;
  descriptionKh?: string;
  address: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Table {
  id: ID;
  restaurantId: ID;
  number: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Staff interface
export interface Staff {
  id: ID;
  restaurantId: ID;
  telegramId: bigint
  role: StaffRole;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Telegram groups
export interface TelegramGroup {
  id: ID;
  chatId: bigint;
  restaurantId: ID;
  groupType: GroupType;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Menu types
export interface MenuCategory {
  id: ID;
  restaurantId: ID;
  name: string;
  nameKh?: string;
  description?: string;
  descriptionKh?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MenuItem {
  id: ID;
  categoryId: ID;
  restaurantId: ID;
  name: string;
  nameKh?: string;
  description?: string;
  descriptionKh?: string;
  imageUrl?: string;
  preparationTimeMinutes: number;
  isAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  variants?: MenuItemVariant[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Order {
  id: ID;
  customerTelegramId: bigint;
  customerName: string;
  restaurantId: ID;
  tableId: ID;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  currency: Currency;
  estimatedPreparationMinutes: number;
  actualPreparationMinutes?: number;
  notes?: string;
  placedByStaffId?: ID; // If placed by staff on behalf of customer
  orderItems: OrderItem[];
  table?: Table;
  restaurant?: Restaurant;
  placedByStaff?: Staff;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  confirmedAt?: Timestamp;
  readyAt?: Timestamp;
  servedAt?: Timestamp;
}

export interface OrderItem {
  id: ID;
  orderId: ID;
  menuItemId: ID;
  variantId: ID;
  quantity: number;
  spiceLevel?: SpiceLevel;
  notes?: string;
  unitPrice: number;
  subtotal: number;
  menuItem?: MenuItem;
  variant?: MenuItemVariant;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Kitchen load tracking
export interface KitchenLoad {
  id: ID;
  restaurantId: ID;
  currentOrders: number;
  averagePreparationTime: number;
  lastUpdated: Timestamp;
  createdAt: Timestamp;
}

export interface MenuItemVariant {
  id: ID;
  menuItemId: ID;
  size: ItemSize;
  name?: string;
  nameKh?: string;
  price: number;
  isAvailable: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  ['super-admin']: [
    'restaurants:create',
    'restaurants:read',
    'restaurants:update', 
    'restaurants:delete',
    'staff:assign_admin',
    'system:manage'
  ],
  [StaffRole.ADMIN]: [
    'restaurant:manage',
    'menu:manage',
    'tables:manage',
    'staff:assign',
    'orders:read',
    'analytics:read',
    'telegram_groups:manage'
  ],
  [StaffRole.MANAGER]: [
    'restaurant:read',
    'menu:manage',
    'tables:manage',
    'orders:read',
    'analytics:read',
    'telegram_groups:read'
  ],
  [StaffRole.KITCHEN]: [
    'orders:read',
    'orders:update_status',
    'menu:toggle_availability'
  ],
  [StaffRole.SERVICE]: [
    'orders:read',
    'orders:update_status',
    'menu:toggle_availability',
    'orders:place_for_customer'
  ]
} as const;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// DTOs (Data Transfer Objects)
export interface CreateRestaurantDto {
  name: string;
  nameKh?: string;
  description?: string;
  descriptionKh?: string;
  address: string;
  phoneNumber: string;
  adminTelegramId?: bigint; // Optional - can be assigned later
}

export interface AssignRestaurantAdminDto {
  restaurantId: ID;
  telegramId: bigint;
}

export interface CreateStaffDto {
  restaurantId: ID;
  telegramId: bigint;
  role: StaffRole;
}

export interface CreateOrderDto {
  tableId: ID;
  orderItems: {
    menuItemId: ID;
    variantId: ID;
    quantity: number;
    spiceLevel?: SpiceLevel;
    notes?: string;
  }[];
  notes?: string;
}

export interface UpdateOrderStatusDto {
  orderId: ID;
  status: OrderStatus;
}

export interface CreateTelegramGroupDto {
  chatId: bigint;
  restaurantId: ID;
  groupType: GroupType;
}

export interface UpdateMenuItemAvailabilityDto {
  menuItemId: ID;
  isAvailable: boolean;
  variantId?: ID; // Optional - to toggle specific variant
}

// Extended types
export interface MenuItemWithCategory extends MenuItem {
  category: MenuCategory;
}

export interface MenuItemWithVariants extends MenuItem {
  variants: MenuItemVariant[];
  defaultVariant?: MenuItemVariant;
}

export interface OrderWithDetails extends Order {
  restaurant: Restaurant;
  table: Table;
  orderItems: (OrderItem & {
    menuItem: MenuItem;
    variant: MenuItemVariant;
  })[];
}

export interface StaffWithRestaurant extends Staff {
  restaurant: Restaurant;
}

export interface RestaurantWithStaff extends Restaurant {
  staff: Staff[];
  telegramGroups?: TelegramGroup[];
}

// WebSocket events
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Timestamp;
}

export interface OrderStatusUpdateEvent extends WebSocketEvent {
  type: 'order_status_update';
  data: {
    orderId: ID;
    status: OrderStatus;
    estimatedTime?: number;
  };
}

export interface NewOrderEvent extends WebSocketEvent {
  type: 'new_order';
  data: OrderWithDetails;
}

export interface StaffActionEvent extends WebSocketEvent {
  type: 'staff_action';
  data: {
    action: 'menu_toggle' | 'order_placed' | 'status_update';
    staffId: ID;
    staffName: string;
    details: any;
  };
}

// Analytics types
export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  cancelledOrders: number;
  completedOrders: number;
}

export interface PopularItem {
  menuItem: MenuItem;
  variant: MenuItemVariant;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export interface KitchenEfficiency {
  averagePreparationTime: number;
  onTimeOrders: number;
  lateOrders: number;
  currentLoad: number;
}

// Error types (keeping the same as before)
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class UnprocessableError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.UNPROCESSABLE, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
}

export class BadRequestError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
  }
}

export class ServerError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export class AccessDeniedError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(message?: string) {
    super(message || 'Insufficient permissions for this action', HTTP_STATUS.FORBIDDEN);
  }
}
