import type { MenuItemDetails, MenuItemVariant, OrderStatus } from "@dine-now/shared";

// Helper functions for variants
export const getDefaultVariant = (item: MenuItemDetails) => {
  return item.variants.find((v: MenuItemVariant) => v.isDefault) || item.variants[0];
};

export const getStatusEmoji = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return '⏳';
    case 'confirmed': return '✅';
    case 'preparing': return '👨‍🍳';
    case 'ready': return '🔔';
    case 'served': return '🎉';
    case 'cancelled': return '❌';
    default: return '📋';
  }
};

export const getStatusTextColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return 'text-yellow-600';
    case 'confirmed': return 'text-blue-600';
    case 'preparing': return 'text-orange-600';
    case 'ready': return 'text-green-600';
    case 'served': return 'text-green-700';
    case 'cancelled': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

export const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'confirmed': return 'primary';
    case 'preparing': return 'warning';
    case 'ready': return 'primary';
    case 'served': return 'primary';
    case 'cancelled': return 'critical';
    default: return 'secondary';
  }
};
