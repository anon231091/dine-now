// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// WebSocket Configuration
export const WS_CONFIG = {
  URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
  HEARTBEAT_INTERVAL: 30000,
} as const;

// Telegram Configuration
export const TELEGRAM_CONFIG = {
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL || '',
  MAX_MESSAGE_LENGTH: 4096,
  MAX_INLINE_KEYBOARD_BUTTONS: 100,
} as const;

// Database Configuration
export const DB_CONFIG = {
  MAX_CONNECTIONS: 20,
  CONNECTION_TIMEOUT: 10000,
  QUERY_TIMEOUT: 5000,
} as const;

// Business Rules
export const BUSINESS_RULES = {
  // Order limits
  MAX_ITEMS_PER_ORDER: 50,
  MAX_ORDER_VALUE: 1000,
  MIN_ORDER_VALUE: 1,
  
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

// Status Messages
export const STATUS_MESSAGES = {
  ORDER_PLACED: 'Your order has been placed successfully!',
  ORDER_CONFIRMED: 'Your order has been confirmed by the kitchen.',
  ORDER_PREPARING: 'Your order is being prepared.',
  ORDER_READY: 'Your order is ready! Please wait for service.',
  ORDER_SERVED: 'Your order has been served. Enjoy your meal!',
  ORDER_CANCELLED: 'Your order has been cancelled.',
} as const;

// Status Messages in Khmer
export const STATUS_MESSAGES_KH = {
  ORDER_PLACED: 'ការបញ្ជាទិញរបស់អ្នកត្រូវបានដាក់ដោយជោគជ័យ!',
  ORDER_CONFIRMED: 'ការបញ្ជាទិញរបស់អ្នកត្រូវបានបញ្ជាក់ដោយផ្ទះបាយ។',
  ORDER_PREPARING: 'ការបញ្ជាទិញរបស់អ្នកកំពុងត្រូវបានរៀបចំ។',
  ORDER_READY: 'ការបញ្ជាទិញរបស់អ្នករួចរាល់ហើយ! សូមរង់ចាំសេវាកម្ម។',
  ORDER_SERVED: 'ការបញ្ជាទិញរបស់អ្នកត្រូវបានបម្រើ។ សូមរីករាយជាមួយអាហាររបស់អ្នក!',
  ORDER_CANCELLED: 'ការបញ្ជាទិញរបស់អ្នកត្រូវបានបោះបង់។',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_TABLE_ID: 'Invalid table ID',
  INVALID_ORDER_ID: 'Invalid order ID',
  INVALID_MENU_ITEM: 'Invalid menu item',
  ITEM_NOT_AVAILABLE: 'Item is not available',
  INSUFFICIENT_STOCK: 'Insufficient stock',
  ORDER_NOT_FOUND: 'Order not found',
  CUSTOMER_NOT_FOUND: 'Customer not found',
  UNAUTHORIZED: 'Unauthorized access',
  VALIDATION_ERROR: 'Validation error',
  NETWORK_ERROR: 'Network error',
  SERVER_ERROR: 'Server error',
  UNKNOWN_ERROR: 'Unknown error occurred',
} as const;

// Error Messages in Khmer
export const ERROR_MESSAGES_KH = {
  INVALID_TABLE_ID: 'លេខតុមិនត្រឹមត្រូវ',
  INVALID_ORDER_ID: 'លេខការបញ្ជាទិញមិនត្រឹមត្រូវ',
  INVALID_MENU_ITEM: 'ម្ហូបមិនត្រឹمត្រូវ',
  ITEM_NOT_AVAILABLE: 'ម្ហូបនេះមិនមាន',
  INSUFFICIENT_STOCK: 'ស្ទុកមិនគ្រប់គ្រាន់',
  ORDER_NOT_FOUND: 'រកមិនឃើញការបញ្ជាទិញ',
  CUSTOMER_NOT_FOUND: 'រកមិនឃើញអ្នកទិញ',
  UNAUTHORIZED: 'គ្មានសិទ្ធិចូលប្រើ',
  VALIDATION_ERROR: 'កំហុសក្នុងការផ្ទៀងផ្ទាត់',
  NETWORK_ERROR: 'កំហុសបណ្តាញ',
  SERVER_ERROR: 'កំហុសសម្រាប់កម្មវិធី',
  UNKNOWN_ERROR: 'មានកំហុសមិនស្គាល់កើតឡើង',
} as const;

// Telegram Bot Commands
export const BOT_COMMANDS = {
  START: '/start',
  HELP: '/help',
  ORDERS: '/orders',
  STATUS: '/status',
  CANCEL: '/cancel',
} as const;

// Telegram Bot Messages
export const BOT_MESSAGES = {
  WELCOME: 'Welcome to our restaurant ordering system!',
  NEW_ORDER: '🍽️ New Order Received',
  ORDER_UPDATE: '📋 Order Status Update',
  ORDER_READY: '✅ Order Ready for Service',
  HELP_TEXT: `
Available commands:
/orders - View all pending orders
/status - Check kitchen status
/help - Show this help message
  `,
} as const;

// WebSocket Events
export const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  NEW_ORDER: 'new_order',
  ORDER_STATUS_UPDATE: 'order_status_update',
  KITCHEN_STATUS_UPDATE: 'kitchen_status_update',
  ERROR: 'error',
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

// Regular Expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_KH: /^(\+855|0)(1[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])[0-9]{6,7}$/,
  ORDER_NUMBER: /^ORD-\d{8}-\d{6}$/,
  TABLE_QR: /^QR-[a-zA-Z0-9]+-[a-zA-Z0-9]+-\d+$/,
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

// Rate Limiting
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  MESSAGE: 'Too many requests, please try again later.',
} as const;

// Locales
export const LOCALES = {
  EN: 'en',
  KH: 'km',
} as const;

// Default Values
export const DEFAULTS = {
  LOCALE: LOCALES.EN,
  CURRENCY: 'USD',
  TIMEZONE: 'Asia/Phnom_Penh',
  PAGE_SIZE: 20,
  PREPARATION_TIME: 15,
  SPICE_LEVEL: 'none',
  ITEM_SIZE: 'medium',
} as const;

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
