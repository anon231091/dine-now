import { SpiceLevel, ItemSize, OrderStatus } from '../types';

// ID generation utilities
export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const generateOrderNumber = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.getTime().toString().slice(-6);
  return `ORD-${dateStr}-${timeStr}`;
};

export const generateQRCode = (tableId: string, restaurantId: string): string => {
  return `QR-${restaurantId}-${tableId}-${Date.now()}`;
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone: string): boolean => {
  // Cambodia phone number format validation
  const phoneRegex = /^(\+855|0)(1[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])[0-9]{6,7}$/;
  return phoneRegex.test(phone);
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// Time utilities
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

export const isWithinBusinessHours = (
  time: Date,
  openTime: string = '06:00',
  closeTime: string = '22:00'
): boolean => {
  const timeStr = time.toTimeString().slice(0, 5);
  return timeStr >= openTime && timeStr <= closeTime;
};

// Price utilities
export const formatPrice = (price: number, currency: string = 'USD'): string => {
  if (currency === 'USD') {
    return `$${price.toFixed(2)}`;
  }
  if (currency === 'KHR') {
    return `${price.toLocaleString('km-KH')} ៛`;
  }
  return price.toFixed(2);
};

export const calculateSubtotal = (unitPrice: number, quantity: number): number => {
  return parseFloat((unitPrice * quantity).toFixed(2));
};

export const calculateTotal = (subtotals: number[]): number => {
  return parseFloat(subtotals.reduce((sum, subtotal) => sum + subtotal, 0).toFixed(2));
};

// Order utilities
export const estimatePreparationTime = (
  baseTime: number,
  quantity: number,
  kitchenLoad: number = 1
): number => {
  const timePerItem = Math.ceil(baseTime * 0.3); // Additional time per extra item
  const loadMultiplier = Math.max(1, kitchenLoad * 0.2); // Kitchen load factor
  
  return Math.ceil((baseTime + (quantity - 1) * timePerItem) * loadMultiplier);
};

export const getOrderStatusColor = (status: OrderStatus): string => {
  const colors = {
    [OrderStatus.PENDING]: '#FFA500',
    [OrderStatus.CONFIRMED]: '#4169E1',
    [OrderStatus.PREPARING]: '#FF4500',
    [OrderStatus.READY]: '#32CD32',
    [OrderStatus.SERVED]: '#228B22',
    [OrderStatus.CANCELLED]: '#DC143C'
  };
  return colors[status] || '#808080';
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

// Spice level utilities
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

export const getSpiceLevelTextKh = (level: SpiceLevel): string => {
  const texts = {
    [SpiceLevel.NONE]: 'មិនហឹរ',
    [SpiceLevel.MILD]: 'ហឹរបន្តិច',
    [SpiceLevel.MEDIUM]: 'ហឹរមធ្យម',
    [SpiceLevel.SPICY]: 'ហឹរ',
    [SpiceLevel.VERY_SPICY]: 'ហឹរខ្លាំង'
  };
  return texts[level] || 'មិនហឹរ';
};

// Size utilities
export const getSizeText = (size: ItemSize): string => {
  const texts = {
    [ItemSize.SMALL]: 'Small',
    [ItemSize.MEDIUM]: 'Medium',
    [ItemSize.LARGE]: 'Large'
  };
  return texts[size] || 'Medium';
};

export const getSizeTextKh = (size: ItemSize): string => {
  const texts = {
    [ItemSize.SMALL]: 'តូច',
    [ItemSize.MEDIUM]: 'មធ្យម',
    [ItemSize.LARGE]: 'ធំ'
  };
  return texts[size] || 'មធ្យម';
};

// Localization utilities
export const getLocalizedText = (
  text: string,
  textKh?: string,
  locale: string = 'en'
): string => {
  if (locale === 'km' && textKh) {
    return textKh;
  }
  return text;
};

// Date utilities for Cambodia timezone
export const getCambodiaTime = (): Date => {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Phnom_Penh"}));
};

export const formatCambodiaTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
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

// Deep clone utility
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Retry utility
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts) break;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
};
