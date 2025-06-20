# 🗄️ Database Module Overview
## 1. Schema Design (`schema/index.ts`)

* Complete database schema with proper relationships and constraints
* PostgreSQL enums for order status, spice levels, item sizes, staff roles
* Optimized indexing for performance on common queries
* Foreign key relationships with cascade deletes where appropriate
* Timestamp tracking with created/updated dates

### Key Tables:

* `restaurants` - Restaurant information
* `tables` - Table management with QR codes
* `customers` - Customer profiles from Telegram
* `staff` - Restaurant staff with roles
* `menu_categories` - Menu organization
* `menu_items` - Individual menu items with multilingual support
* `orders` - Order tracking with status workflow
* `order_items` - Detailed order line items
* `kitchen_loads` - Kitchen capacity tracking

## 2. Database Configuration (`config/index.ts`)

* Environment-specific configs for dev/test/staging/production
* Connection pooling with postgres-js
* Health checks and connection monitoring
* Transaction helpers for complex operations
* Auto-reconnection and error handling

## 3. Comprehensive Seed Data (`seed/index.ts`)

* Real Cambodian restaurant data with English/Khmer translations
* Sample menus with authentic dishes (Amok, Lok Lak, etc.)
* Multiple restaurants (Khmer Kitchen, Mekong Cafe)
* Staff with different roles (admin, kitchen, service)
* Sample orders with realistic order flows
* Kitchen load tracking data

## 4. Advanced Query Helpers (`queries/index.ts`)

* Optimized queries for common operations
* Join queries for related data
* Search functionality with multilingual support
* Pagination support for large datasets
* Analytics queries for business insights
* Kitchen management queries for real-time operations

# 🚀 Key Features
## Cambodia-Specific Design

* Bilingual support (English/Khmer) throughout schema
* Local phone number validation patterns
* Cambodia timezone handling
* Local currency support (USD/KHR)

## Restaurant Operations

* QR code table management for seamless ordering
* Order status workflow (pending → confirmed → preparing → ready → served)
* Kitchen load tracking for accurate preparation time estimates
* Staff role management with Telegram integration
* Real-time order updates support

## Performance Optimized

* Strategic indexing on frequently queried columns
* Efficient joins with proper foreign keys
* Connection pooling for high concurrency
* Query optimization with Drizzle ORM

## Developer Experience

* Type-safe queries with full TypeScript support
* Transaction support for complex operations
* Comprehensive error handling
* Easy migration management with Drizzle Kit
* Flexible seeding system for development/testing

# 📁 Usage Examples
```bash
# Setup database
npm run db:setup          # Push schema + seed data
npm run db:reset          # Clear + reseed everything

# Migrations
npm run db:generate       # Generate migrations
npm run db:migrate        # Run migrations
npm run db:studio         # Open Drizzle Studio

# Seeding
npm run seed              # Seed with sample data
npm run seed:clear        # Clear all data
npm run seed:reseed       # Clear + reseed
```
```typescript
// Using in your application
import { getDatabase, queries } from '@restaurant-app/database';

// Get menu for restaurant
const menu = await queries.menu.getMenuByRestaurant(restaurantId);

// Create new order
const order = await queries.order.createOrder({
  customerId,
  restaurantId,
  tableId,
  orderNumber: generateOrderNumber(),
  totalAmount: '25.50',
  estimatedPreparationMinutes: 20,
  orderItems: [/* ... */]
});

// Get active kitchen orders
const activeOrders = await queries.order.getActiveOrdersForKitchen(restaurantId);
```

# 🛠️ Ready for Production
The database module includes:

* Environment configurations for all deployment stages
* Connection monitoring and health checks
* Error handling and retry logic
* Performance monitoring capabilities
* Backup-friendly structure with proper constraints
