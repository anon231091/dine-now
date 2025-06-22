// Base types
export type ID = string;
export type Timestamp = Date;

// User types
export interface Customer {
  id: ID;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  price: number;
  imageUrl?: string;
  preparationTimeMinutes: number;
  isAvailable: boolean;
  isActive: boolean;
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
  MILD = 'mild',
  MEDIUM = 'medium',
  SPICY = 'spicy',
  VERY_SPICY = 'very_spicy'
}

export enum ItemSize {
  SMALL = 'small',
  MEDIUM = 'medium',
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
  quantity: number;
  size?: ItemSize;
  spiceLevel?: SpiceLevel;
  notes?: string;
  unitPrice: number;
  subtotal: number;
  menuItem?: MenuItem; // Populated when needed
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Order {
  id: ID;
  customerId: ID;
  restaurantId: ID;
  tableId: ID;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  currency: Currency,
  estimatedPreparationMinutes: number;
  actualPreparationMinutes?: number;
  notes?: string;
  orderItems: OrderItem[];
  customer?: Customer; // Populated when needed
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
  telegramId: number;
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
  customerId: ID;
  orderItems: {
    menuItemId: ID;
    quantity: number;
    size?: ItemSize;
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

export interface OrderWithDetails extends Order {
  customer: Customer;
  table: Table;
  orderItems: (OrderItem & { menuItem: MenuItem })[];
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

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}
