# 🎯 Telegram Mini App Overview
## 🏗️ Tech Stack & Architecture

* Next.js 14 with App Router for modern React development
* @telegram-apps/sdk-react for official Telegram Mini App integration
* @telegram-apps/telegram-ui for native Telegram UI components
* Zustand for efficient state management
* Tanstack react Query for server state and caching
* TypeScript for type safety throughout

## 📱 Core Features
### 🔐 Seamless Authentication

* Automatic Telegram user authentication
* JWT token management with persistence
* No additional login required

### 🏪 Restaurant Access

* QR code scanning for instant table access
* Restaurant selection with bilingual info
* Real-time kitchen status display

### 🍽️ Menu Experience

* Category-based navigation with tabs
* Search and filtering capabilities
* Detailed item modals with customization options
* Real-time pricing and preparation times

### 🛒 Smart Cart Management

* Real-time cart updates with Telegram main button
* Item customization (size, spice level, notes)
* Order summary with estimated time
* Seamless checkout process

### 📲 Real-time Order Tracking

* WebSocket integration for live updates
* Order status notifications
* Kitchen load monitoring
* Order history access

## 🌏 Cambodia-Specific Features
### 🇰🇭 Full Localization

* Complete Khmer language support
* English/Khmer menu translations
* Cultural UI adaptations
* Cambodia timezone handling

### 💰 Local Business Support

* USD/KHR currency formatting
* Cambodia phone number validation
* Local business hours support

## 🎨 Native Telegram Experience
### 🎯 Telegram Integration

* Uses official Telegram UI components
* Respects user's theme (light/dark)
* Haptic feedback for interactions
* Main/Back button integration
* WebApp lifecycle management

### 📱 Mobile-First Design

* Responsive layout for all devices
* Touch-friendly interactions
* Smooth animations and transitions
* Optimized for Telegram viewing

## 🔄 Real-time Features
### ⚡ Live Updates

* WebSocket connection for real-time order updates
* Kitchen status monitoring
* Order progress tracking
* Instant notifications

### 📊 Smart Features

* Automatic cart calculations
* Dynamic preparation time estimates
* Kitchen load-based timing
* Persistent shopping sessions

### 🛠️ Development Ready
The Mini App includes:

* Complete environment setup for development and production
* TypeScript configuration with strict typing
* Tailwind CSS with Telegram theme variables
* Component architecture for easy maintenance
* State management with Zustand stores
* API integration with React Query hooks

### 📂 Key Components Created

* TelegramProvider - SDK integration and lifecycle management
* AuthScreen - Seamless Telegram authentication
* RestaurantSelection - QR code access and restaurant browsing
* MenuView - Main ordering interface with categories
* MenuItemModal - Item customization with options
* CartDrawer - Shopping cart with checkout flow
* API Client - Complete backend integration with React Query

### 🚀 Usage Flow

* Customer scans QR code → Opens Mini App with table context
* Automatic authentication using Telegram user data
* Browse menu with categories, search, and filtering
* Customize items with size, spice level, and notes
* Real-time cart updates with Telegram main button
* Place order with seamless checkout
* Track progress with live WebSocket updates
