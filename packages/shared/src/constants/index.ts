// Predefined enum values in DB
export const USER_TYPES = [
  'general',
  'staff'
] as const;

export const STAFF_ROLES = [
  'admin',
  'manager',
  'kitchen',
  'service'
] as const;

export const ORDER_STATUS = [
  'pending',
  'confirmed', 
  'preparing',
  'ready',
  'served',
  'cancelled'
] as const;

export const GROUP_TYPES = [
  'management',
  'kitchen',
  'service'
] as const;

export const ITEM_SIZES = [
  'small',
  'regular',
  'large'
] as const;

export const SPICE_LEVELS = [
  'none',
  'regular',
  'spicy',
  'very_spicy'
] as const;

// Environment
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

// Log Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  ACCESS_DENIED: 'Access denied',
  NOT_FOUND: 'Not found request',
  VALIDATION_ERROR: 'Validation error',
  NETWORK_ERROR: 'Network error',
  SERVER_ERROR: 'Server error',
  UNKNOWN_ERROR: 'Unknown error occurred',
  CONFLICT_ERROR: 'Duplicate entry',
  REFERENCE_ERROR: 'Invalid reference',
  UNPROCESSABLE: 'Unprocessable request',
  NO_PERMISSION: 'Insufficient permissions for this action',
  RATE_LIMITED: 'Too many requests, please try again later'
} as const;

// Business Rules
export const BUSINESS_RULES = {
  // Order limits
  MAX_ITEMS_PER_ORDER: 50,
  MAX_ORDER_VALUE: 1000,
  MIN_ORDER_VALUE: 1,
  MAX_PER_ITEM: 50,
  
  // Time limits (in minutes)
  ORDER_TIMEOUT: 30,
  MAX_PREPARATION_TIME: 120,
  MIN_PREPARATION_TIME: 5,
  DEFAULT_PREPARATION_TIME: 15,
  
  // Kitchen load factors
  MAX_CONCURRENT_ORDERS: 20,
  KITCHEN_LOAD_MULTIPLIER: 0.2,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // File upload
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

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
  ['admin']: [
    'restaurant:manage',
    'menu:manage',
    'tables:manage',
    'staff:assign',
    'orders:read',
    'analytics:read',
    'telegram_groups:manage'
  ],
  ['manager']: [
    'restaurant:read',
    'menu:manage',
    'tables:manage',
    'orders:read',
    'analytics:read',
    'telegram_groups:read'
  ],
  ['kitchen']: [
    'orders:read',
    'orders:update_status',
    'menu:toggle_availability'
  ],
  ['service']: [
    'orders:read',
    'orders:update_status',
    'menu:toggle_availability',
    'orders:place_for_customer'
  ]
} as const;

// Status Messages
export const STATUS_MESSAGES = {
  ORDER_PLACED: 'Your order has been placed successfully!',
  ORDER_CONFIRMED: 'Your order has been confirmed by the kitchen.',
  ORDER_PREPARING: 'Your order is being prepared.',
  ORDER_READY: 'Your order is ready! Please wait for service.',
  ORDER_SERVED: 'Your order has been served. Enjoy your meal!',
  ORDER_CANCELLED: 'Your order has been cancelled.',
} as const;

// WebSocket Events
export const WS_EVENTS = {
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  CONNECTION: 'connection',
  CONNECTED: 'connected',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  NEW_ORDER: 'new_order',
  ORDER_STATUS_UPDATE: 'order_status_update',
  KITCHEN_STATUS_UPDATE: 'kitchen_status_update',
  ERROR: 'error',
} as const;

// Regular Expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_KH: /^(\+855|0)(1[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])[0-9]{6,7}$/,
  ORDER_NUMBER: /^ORD-\d{8}-\d{6}$/,
  PRICE: /^\d+(\.\d{1,2})?$/
} as const;

// Cache Keys
export const CACHE_KEYS = {
  MENU_ITEMS: 'menu_items',
  KITCHEN_LOAD: 'kitchen_load',
  ACTIVE_ORDERS: 'active_orders',
  CUSTOMER_ORDERS: 'customer_orders',
  TABLE_INFO: 'table_info',
} as const;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  MENU_ITEMS: 3600, // 1 hour
  KITCHEN_LOAD: 60, // 1 minute
  ACTIVE_ORDERS: 30, // 30 seconds
  CUSTOMER_ORDERS: 300, // 5 minutes
  TABLE_INFO: 86400, // 24 hours
} as const;

// File Paths
export const FILE_PATHS = {
  MENU_IMAGES: '/uploads/menu/',
  RESTAURANT_IMAGES: '/uploads/restaurants/',
  QR_CODES: '/uploads/qr/',
  TEMP: '/tmp/',
} as const;
