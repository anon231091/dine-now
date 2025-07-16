import { ERROR_MESSAGES, GROUP_TYPES, HTTP_STATUS, ITEM_SIZES, ORDER_STATUS, SPICE_LEVELS, STAFF_ROLES, USER_TYPES } from "../constants";

// Base types
export type ID = string;
export type TelegramId = bigint;
export type Timestamp = Date;

export type UserType = typeof USER_TYPES[number];

export type StaffRole = typeof STAFF_ROLES[number]; 

export type GroupType = typeof GROUP_TYPES[number]; 

export type OrderStatus = typeof ORDER_STATUS[number]; 

export type SpiceLevel = typeof SPICE_LEVELS[number];

export type ItemSize = typeof ITEM_SIZES[number];

// Restaurant structure
export interface Restaurant {
  id: ID;
  name: string;
  nameKh?: string;
  description?: string;
  descriptionKh?: string;
  address?: string;
  phoneNumber?: string;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export interface Order {
  id: ID;
  customerTelegramId: bigint;
  customerName: string;
  restaurantId: ID;
  tableId: ID;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  estimatedPreparationMinutes: number;
  actualPreparationMinutes?: number;
  notes?: string;
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

// Extended types
export interface MenuItemDetails extends MenuItem {
  variants: MenuItemVariant[];
}

export interface MenuItemWithRestaurant extends MenuItem {
  restaurant: Restaurant;
}

export interface MenuCategoryWithRestaurant extends MenuCategory {
  restaurant: Restaurant;
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export interface MenuCategoryWithItemDetails extends MenuCategory {
  items: MenuItemDetails[];
}

export interface MenuItemDetailsWithCategory extends MenuItemDetails {
  category: MenuCategory;
}

export interface VariantWithMenuItem extends MenuItemVariant {
  item: MenuItem;
}

export interface OrderDetails extends Order {
  orderItems: OrderItem[];
}

export interface OrderWithTable extends Order {
  table: Table;
}

export interface OrderWithInfo extends Order {
  restaurant: Restaurant;
  table: Table;
}

export interface OrderDetailsWithTable extends OrderDetails {
  table: Table;
}

export interface OrderDetailsWithInfo extends OrderDetails {
  restaurant: Restaurant;
  table: Table;
}

export interface StaffWithRestaurant extends Staff {
  restaurant: Restaurant;
}

export interface RestaurantDetails extends Restaurant {
  tables: Table[];
}

export interface RestaurantWithCategories extends Restaurant {
  categories: MenuCategory[];
}

export interface RestaurantWithStaff extends Restaurant {
  staff: Staff[];
}

export interface RestaurantWithTelegramGroups extends Restaurant {
  groups: TelegramGroup[];
}

export interface TableWithRestaurant extends Table {
  restaurant: Restaurant;
}

export interface TelegramGroupWithRestaurant extends TelegramGroup {
  restaurant: Restaurant;
}

export interface KitchenLoadInfo {
  currentOrders: number;
  averagePreparationTime: number;
  lastUpdated: Timestamp;
}

export interface KitchenLoadStatus extends KitchenLoadInfo {
  ordersByStatus: Record<OrderStatus, number>;
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

export interface HourlyOrderDistribution {
  hour: number;
  orderCount: number;
  totalRevenue: number;
}

export interface Analytics {
  orderStats: OrderStats;
  popularItems: PopularItem[];
  hourlyDistribution: HourlyOrderDistribution[];
  period: {
    from: Date;
    to: Date;
    days: number;
  }
}

export interface KitchenEfficiency {
  averagePreparationTime: number;
  onTimeOrders: number;
  lateOrders: number;
  currentLoad: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
  data: OrderDetails;
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

export class BadRequestError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class AccessDeniedError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
}

export class UnprocessableError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.UNPROCESSABLE, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
}

export class ServerError extends AppError {
  constructor(message?: string) {
    super(message || ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
