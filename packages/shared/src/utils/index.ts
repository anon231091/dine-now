import { SpiceLevel, OrderStatus } from '../types';

// Order utilities
export const generateOrderNumber = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.getTime().toString().slice(-6);
  return `ORD-${dateStr}-${timeStr}`;
};

export const calculateSubtotal = (unitPrice: number, quantity: number): number => {
  return parseFloat((unitPrice * quantity).toFixed(2));
};

export const calculateTotal = (subtotals: number[]): number => {
  return parseFloat(subtotals.reduce((sum, subtotal) => sum + subtotal, 0).toFixed(2));
};

export const estimatePreparationTime = (
  baseTime: number,
  quantity: number,
  kitchenLoad: number = 1
): number => {
  const timePerItem = Math.ceil(baseTime * 0.3); // Additional time per extra item
  const loadMultiplier = Math.max(1, kitchenLoad * 0.2); // Kitchen load factor
  
  return Math.ceil((baseTime + (quantity - 1) * timePerItem) * loadMultiplier);
};

export const getOrderStatusText = (status: OrderStatus): string => {
  const texts = {
    [OrderStatus.PENDING]: 'Pending',
    [OrderStatus.CONFIRMED]: 'Confirmed',
    [OrderStatus.PREPARING]: 'Preparing',
    [OrderStatus.READY]: 'Ready',
    [OrderStatus.SERVED]: 'Served',
    [OrderStatus.CANCELLED]: 'Cancelled'
  };
  return texts[status] || 'Unknown';
};

export const getSpiceLevelText = (level: SpiceLevel): string => {
  const texts = {
    [SpiceLevel.NONE]: 'No Spice',
    [SpiceLevel.MILD]: 'Mild 🌶️',
    [SpiceLevel.MEDIUM]: 'Medium 🌶️🌶️',
    [SpiceLevel.SPICY]: 'Spicy 🌶️🌶️🌶️',
    [SpiceLevel.VERY_SPICY]: 'Very Spicy 🌶️🌶️🌶️🌶️'
  };
  return texts[level] || 'No Spice';
};

// Array utilities
export const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};
