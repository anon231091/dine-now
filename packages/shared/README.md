# 📦 Shared Modules Overview
## 1. Types & Interfaces (`types/index.ts`)

* Core entities: Customer, Restaurant, Table, MenuCategory, MenuItem, Order, OrderItem, Staff, KitchenLoad
* Enums: OrderStatus, SpiceLevel, ItemSize, StaffRole
* DTOs: CreateOrderDto, UpdateOrderStatusDto for API communication
* Extended types: OrderWithDetails, MenuItemWithCategory for populated data
* WebSocket events: For real-time order updates
* Error classes: AppError, ValidationError, NotFoundError, UnauthorizedError

## 2. Utilities (`utils/index.ts`)

* ID generation: generateId(), generateOrderNumber(), generateQRCode()
* Validation: isValidEmail(), isValidPhoneNumber(), sanitizeInput()
* Time utilities: formatDuration(), Cambodia timezone support
* Price utilities: formatPrice() with USD/KHR currency support
* Order utilities: estimatePreparationTime() with kitchen load factor
* Localization: getLocalizedText() for English/Khmer support
* Performance: debounce(), retry(), deepClone()

## 3. Constants (`constants/index.ts`)

* API/WebSocket config: URLs, timeouts, retry settings
* Business rules: Order limits, preparation times, pagination
* Localized messages: Status updates in English and Khmer
* Error messages: Comprehensive error handling in both languages
* Telegram bot: Commands and message templates
* Cache settings: Keys and TTL values
* File paths: Upload directories and regex patterns

## 4. Validation Schemas (`validators/index.ts`)

* Zod schemas for all entities and operations
* Cambodia-specific validation: Phone number format
* Business rule enforcement: Order limits, preparation times
* API validation: Pagination, search, file uploads
* Telegram webhook: Update parsing
* Helper functions: validateSchema(), ValidationError class

## 5. Package Configuration

* Modern TypeScript: ES2022 target with strict mode
* Export maps: Clean imports for different modules
* Build system: TypeScript compilation with source maps
* Testing: Jest configuration ready
* Linting: ESLint with TypeScript support

# 🚀 Key Features
## Cambodia-Specific

* Khmer language support throughout
* Cambodia phone number validation
* Local timezone handling (Asia/Phnom_Penh)
* Currency support (USD/KHR)

## Restaurant Business Logic

* Kitchen load estimation for preparation times
* Spice level and size options
* Order status tracking workflow
* Table-based ordering with QR codes

## Developer Experience

* Full TypeScript support with strict typing
* Comprehensive validation with helpful error messages
* Modular exports for tree-shaking
* Consistent error handling patterns

# 📁 Usage in Your Monorepo
```typescript
// In any package
import { Order, OrderStatus, generateOrderNumber } from '@restaurant-app/shared';
import { CreateOrderSchema } from '@restaurant-app/shared/validators';
import { API_CONFIG, STATUS_MESSAGES_KH } from '@restaurant-app/shared/constants';
```

The shared package provides a solid foundation with:

* Type safety across all services
* Consistent validation rules
* Reusable business logic
* Localization support
* Error handling patterns
