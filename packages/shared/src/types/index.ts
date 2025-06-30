import { ERROR_MESSAGES, HTTP_STATUS, SERVICE_PERMISSIONS } from "../constants";

// Base types
export type ID = string;
export type Timestamp = Date;

export enum UserType {
  General = 'general',
  Staff = 'staff'
};

export enum ServiceType {
  Bot = 'bot',
  External = 'external',
};

export type ServicePermissions = (typeof SERVICE_PERMISSIONS)[number];

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
  qrCode: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Menu types
export interface MenuCategory {
  id: ID;
  restaurantId: ID;
  name: string;
  nameKh?: string; // Khmer translation
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
  variants?: MenuItemVariant[]; // Available size variants
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MenuItemVariant {
  id: ID;
  menuItemId: ID;
  size: ItemSize;
  name?: string; // Optional custom name for variant
  nameKh?: string;
  price: number;
  isAvailable: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export enum Currency {
  USD = 'USD',
  KHR = 'KHR'
}

export interface OrderItem {
  id: ID;
  orderId: ID;
  menuItemId: ID;
  variantId: ID; // References specific variant
  quantity: number;
  spiceLevel?: SpiceLevel;
  notes?: string;
  unitPrice: number; // Price from variant at time of order
  subtotal: number;
  menuItem?: MenuItem; // Populated when needed
  variant?: MenuItemVariant; // Populated when needed
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Order {
  id: ID;
  customerTelegramId: bigint; // Direct reference to Telegram user ID
  customerName: string; // Display name for orders
  restaurantId: ID;
  tableId: ID;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  currency: Currency;
  estimatedPreparationMinutes: number;
  actualPreparationMinutes?: number;
  notes?: string;
  orderItems: OrderItem[];
  table?: Table; // Populated when needed
  restaurant?: Restaurant;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  confirmedAt?: Timestamp;
  readyAt?: Timestamp;
  servedAt?: Timestamp;
}

// Kitchen load tracking
export interface KitchenLoad {
  id: ID;
  restaurantId: ID;
  currentOrders: number;
  averagePreparationTime: number;
  lastUpdated: Timestamp;
}

// Staff types
export interface Staff {
  id: ID;
  restaurantId: ID;
  telegramId: bigint;
  firstName: string;
  lastName?: string;
  username?: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum StaffRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  KITCHEN = 'kitchen',
  SERVICE = 'service'
}

// Telegram user interface (for authentication)
export interface TelegramUser {
  id: bigint;
  firstName: string;
  lastName?: string;
  username?: string;
}

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
export interface CreateOrderDto {
  tableId: ID;
  orderItems: {
    menuItemId: ID;
    variantId: ID; // Must specify which variant
    quantity: number;
    spiceLevel?: SpiceLevel;
    notes?: string;
  }[];
  notes?: string;
}

export interface UpdateOrderStatusDto {
  orderId: ID;
  status: OrderStatus;
  notes?: string;
}

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

export interface BotConfig {
  token: string;
  apiUrl: string;
  serviceToken: string;
  webhookUrl?: string;
}

export interface TelegramGroup {
  id: number;
  restaurantId: string;
  name: string;
  isActive: boolean;
}

export interface BotCommand {
  command: string;
  description: string;
  descriptionKh: string;
}

export interface ServiceTokenPayload {
  type: ServiceType;
  permissions: ServicePermissions[];
  restaurantId?: ID;
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

// Error types
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
