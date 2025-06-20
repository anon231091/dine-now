# 🚀 Backend API Service Overview
## 🏗️ Architecture

* Express.js server with TypeScript
* WebSocket integration for real-time updates
* JWT authentication for customers and staff
* Role-based access control for staff operations
* Comprehensive middleware for security, validation, and logging
* Swagger documentation for API endpoints

## 📡 API Endpoints
### Authentication (`/api/auth`)

* `POST /telegram` - Customer authentication via Telegram
* `POST /staff` - Staff authentication
* `GET /verify` - Token verification
* `POST /refresh` - Token refresh

### Restaurants (`/api/restaurants`)

* `GET /` - List active restaurants
* `GET /:restaurantId` - Restaurant details
* `GET /:restaurantId/tables` - Restaurant tables
* `GET /table/qr/:qrCode` - Get table by QR code
* `GET /:restaurantId/kitchen-status` - Kitchen load status
* `GET /:restaurantId/analytics` - Restaurant analytics

### Menu (`/api/menu`)

* `GET /:restaurantId` - Complete menu with categories
* `GET /:restaurantId/search` - Search menu items
* `GET /item/:itemId` - Menu item details
* `GET /:restaurantId/categories` - Menu categories
* `GET /:restaurantId/popular` - Popular items

### Orders (`/api/orders`)

* `POST /` - Create new order
* `GET /:orderId` - Order details
* `GET /customer/history` - Customer order history
* `PATCH /:orderId/status` - Update order status (staff)
* `GET /restaurant/:restaurantId` - Restaurant orders (staff)
* `GET /restaurant/:restaurantId/active` - Active kitchen orders

### Staff (`/api/staff`)

* `GET /restaurant/:restaurantId` - Restaurant staff (admin/manager)
* `GET /me` - Staff profile

### Kitchen (`/api/kitchen`)

* `GET /load/:restaurantId` - Get kitchen load
* `PUT /load/:restaurantId` - Update kitchen load
* `POST /calculate/:restaurantId` - Calculate real-time load

## 🔌 WebSocket Features

* Real-time order updates for customers and staff
* Kitchen notifications for new orders
* Status updates broadcast to relevant parties
* Room-based messaging (customer rooms, restaurant rooms, kitchen rooms)
* Authentication required for WebSocket connections

## 🛡️ Security & Middleware

* Helmet for security headers
* CORS configuration for Telegram Mini Apps
* Rate limiting to prevent abuse
* JWT authentication with proper token validation
* Role-based authorization for staff operations
* Request validation using Zod schemas
* Comprehensive error handling

## 📊 Key Features
### Cambodia-Specific

* Bilingual support throughout the API
* Khmer language responses available
* Local timezone handling
* Cambodia phone number validation

### Restaurant Operations

* QR code table management
* Kitchen load calculation for accurate timing
* Order status workflow management
* Real-time updates via WebSocket
* Analytics and reporting

### Performance & Monitoring

* Health check endpoints for server, database, and WebSocket
* Request timing and logging
* Connection monitoring
* Graceful shutdown handling

## 🔧 Usage Examples
```bash
# Start development server
npm run dev

# Build for production
npm run build
npm start

# Database setup
npm run db:setup
```
```typescript
// Customer authentication
const response = await fetch('/api/auth/telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    telegramId: '123456789',
    firstName: 'Sophea',
    lastName: 'Chan'
  })
});

// Create order
const order = await fetch('/api/orders', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    tableId: 'table-id',
    orderItems: [
      {
        menuItemId: 'item-id',
        quantity: 2,
        spiceLevel: 'medium',
        notes: 'Extra crispy'
      }
    ],
    notes: 'Rush order'
  })
});

// WebSocket connection
const ws = new WebSocket('ws://localhost:3001');
ws.send(JSON.stringify({
  type: 'authenticate',
  token: authToken
}));
```

## 🌟 Production Ready

* Environment configuration for all deployment stages
* Docker support ready
* Health monitoring endpoints
* Graceful shutdown handling
* Comprehensive logging with Winston
* Error tracking and reporting
