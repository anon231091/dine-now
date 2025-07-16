import { useEffect } from 'react';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { retrieveRawInitData } from '@telegram-apps/sdk-react';
import toast from 'react-hot-toast';

import { useWebSocketStore, useOrdersStore } from '@/store';
import { WS_EVENTS } from '@dine-now/shared';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

// Create axios instance with proper authentication
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add Telegram init data authentication
  client.interceptors.request.use(
    (config) => {
      try {
        const initDataRaw = retrieveRawInitData();
        if (initDataRaw) {
          config.headers.Authorization = `tma ${initDataRaw}`;
        }
      } catch (error) {
        console.warn('Failed to get init data for API request:', error);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const status = error.response?.status;
      const message = error.response?.data?.error || 'An error occurred';
      
      if (status === 401) {
        // Authentication failed
        toast.error('Authentication failed. Please refresh the app.');
        return Promise.reject(error);
      }
      
      if (status === 403) {
        // Access denied
        toast.error('Access denied');
        return Promise.reject(error);
      }
      
      if (status === 404) {
        // Not found - let components handle this
        return Promise.reject(error);
      }
      
      if (status >= 500) {
        // Server error
        toast.error('Server error. Please try again.');
        return Promise.reject(error);
      }
      
      // Other client errors
      if (status >= 400) {
        toast.error(message);
        return Promise.reject(error);
      }
      
      return Promise.reject(error);
    }
  );

  return client;
};

export const apiClient = createApiClient();

// API Functions aligned with backend endpoints
export const api = {
  // Restaurant and Table APIs
  restaurants: {
    getAll: () => apiClient.get('/restaurants'),
    getById: (id: string) => apiClient.get(`/restaurants/${id}`),
    getByTableId: (tableId: string) => apiClient.get(`/restaurants/table/${tableId}`),
    getKitchenStatus: (id: string) => apiClient.get(`/restaurants/${id}/kitchen-status`),
    getAnalytics: (id: string, params: { dateFrom: string; dateTo: string }) => 
      apiClient.get(`/restaurants/${id}/analytics`, { params }),
  },

  // Menu APIs with variants support
  menu: {
    getByRestaurant: (restaurantId: string) => 
      apiClient.get(`/menu/${restaurantId}`),
    
    search: (restaurantId: string, params: any) => 
      apiClient.get(`/menu/${restaurantId}/search`, { params }),
    
    getItem: (itemId: string) => 
      apiClient.get(`/menu/item/${itemId}`),
    
    getVariant: (variantId: string) => 
      apiClient.get(`/menu/variant/${variantId}`),
    
    getCategories: (restaurantId: string) => 
      apiClient.get(`/menu/${restaurantId}/categories`),
    
    getPopular: (restaurantId: string, params?: { limit?: number; days?: number }) => 
      apiClient.get(`/menu/${restaurantId}/popular`, { params }),
  },

  // Order APIs with variants support
  orders: {
    create: (data: {
      tableId: string;
      orderItems: Array<{
        menuItemId: string;
        variantId: string; // Required for backend
        quantity: number;
        spiceLevel?: string;
        notes?: string;
      }>;
      notes?: string;
    }) => apiClient.post('/orders', data),
    
    getById: (id: string) => apiClient.get(`/orders/${id}`),
    
    getHistory: (params?: { page?: number; limit?: number }) => 
      apiClient.get('/orders/history', { params }),
    
    updateStatus: (id: string, data: { status: string; notes?: string }) => 
      apiClient.patch(`/orders/${id}/status`, data),
  },
};

// Restaurant hooks
export const useRestaurants = () => {
  return useQuery({
    queryKey: ['restaurants'],
    queryFn: () => api.restaurants.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useRestaurantByTableId = (tableId: string) => {
  return useQuery({
    queryKey: ['restaurant', 'table', tableId],
    queryFn: () => api.restaurants.getByTableId(tableId),
    enabled: !!tableId,
    retry: 1,
    staleTime: 0, // Always fresh for table lookups
  });
};

export const useKitchenStatus = (restaurantId: string) => {
  return useQuery({
    queryKey: ['kitchen-status', restaurantId],
    queryFn: () => api.restaurants.getKitchenStatus(restaurantId),
    enabled: !!restaurantId,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
  });
};

// Menu hooks with variants support
export const useMenu = (restaurantId: string) => {
  return useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => api.menu.getByRestaurant(restaurantId),
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    select: (data) => {
      // Process menu data to ensure variants are properly structured
      if (data?.data?.success && data.data.data) {
        return {
          ...data,
          data: {
            ...data.data,
            data: data.data.data.map((categoryGroup: any) => ({
              ...categoryGroup,
              items: categoryGroup.items?.map((item: any) => ({
                ...item,
                variants: item.variants || [],
                defaultVariant: item.variants?.find((v: any) => v.isDefault) || item.variants?.[0]
              })) || []
            }))
          }
        };
      }
      return data;
    }
  });
};

export const useMenuItem = (itemId: string) => {
  return useQuery({
    queryKey: ['menu-item', itemId],
    queryFn: () => api.menu.getItem(itemId),
    enabled: !!itemId,
    retry: 2,
    select: (data) => {
      // Ensure variants are properly structured
      if (data?.data?.success && data.data.data) {
        const item = data.data.data;
        return {
          ...data,
          data: {
            ...data.data,
            data: {
              ...item,
              variants: item.variants || [],
              defaultVariant: item.variants?.find((v: any) => v.isDefault) || item.variants?.[0]
            }
          }
        };
      }
      return data;
    }
  });
};

export const useMenuItemVariant = (variantId: string) => {
  return useQuery({
    queryKey: ['menu-variant', variantId],
    queryFn: () => api.menu.getVariant(variantId),
    enabled: !!variantId,
    retry: 2,
  });
};

export const usePopularItems = (restaurantId: string, options?: { limit?: number; days?: number }) => {
  return useQuery({
    queryKey: ['popular-items', restaurantId, options],
    queryFn: () => api.menu.getPopular(restaurantId, options),
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

// Order hooks with variants support
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.orders.create,
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Order placed successfully!');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['kitchen-status'] });
        return response.data;
      }
    },
    onError: (error: any) => {
      console.error('Order creation failed:', error);
      const errorMessage = error.response?.data?.error || 'Failed to place order';
      toast.error(errorMessage);
    },
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.orders.getById(orderId),
    enabled: !!orderId,
    refetchInterval: 15000, // Refresh every 15 seconds for real-time updates
    retry: 2,
    select: (data) => {
      // Process order data to ensure variants are included
      if (data?.data?.success && data.data.data) {
        const order = data.data.data;
        return {
          ...data,
          data: {
            ...data.data,
            data: {
              ...order,
              orderItems: order.orderItems?.map((orderItem: any) => ({
                ...orderItem,
                // Ensure variant information is available
                variant: orderItem.variant || {
                  id: 'unknown',
                  size: 'regular',
                  price: orderItem.subtotal || 0,
                  name: 'Regular'
                },
                menuItem: orderItem.menuItem || {
                  id: 'unknown',
                  name: 'Unknown Item',
                  preparationTimeMinutes: 15
                }
              })) || []
            }
          }
        };
      }
      return data;
    }
  });
};

export const useOrderHistory = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['order-history', params],
    queryFn: () => api.orders.getHistory(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};

// WebSocket hook with proper authentication
export const useWebSocket = () => {
  const { setConnected, addMessage } = useWebSocketStore();
  
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isManualClose = false;
    
    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setConnected(true);
          
          // Authenticate with Telegram init data
          try {
            const initDataRaw = retrieveRawInitData();
            if (initDataRaw) {
              ws?.send(JSON.stringify({
                type: WS_EVENTS.AUTHENTICATE,
                initDataRaw,
              }));
            }
          } catch (error) {
            console.error('Failed to authenticate WebSocket:', error);
          }
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            addMessage(message);
            
            // Handle specific message types
            if (message.type === WS_EVENTS.ORDER_STATUS_UPDATE) {
              useOrdersStore.getState().updateOrderStatus(
                message.data.orderId,
                message.data.status
              );
            }
            
            if (message.type === WS_EVENTS.AUTHENTICATED) {
              console.log('WebSocket authenticated:', message);
            }
            
            if (message.type === WS_EVENTS.CONNECTED) {
              console.log('WebSocket connection confirmed:', message);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          setConnected(false);
          
          // Attempt to reconnect unless manually closed
          if (!isManualClose && event.code !== 1000) {
            reconnectTimeout = setTimeout(() => {
              console.log('Attempting to reconnect WebSocket...');
              connect();
            }, 3000);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnected(false);
        };
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setConnected(false);
      }
    };
    
    // Initial connection
    connect();
    
    // Cleanup function
    return () => {
      isManualClose = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close(1000, 'Component unmounted');
      }
    };
  }, [setConnected, addMessage]);
};

// Health check hook
export const useApiHealth = () => {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: () => apiClient.get('/health'),
    refetchInterval: 60000, // Check every minute
    retry: 1,
    staleTime: 30000, // 30 seconds
  });
};

// Currency formatting helper
export const formatCurrency = (amount: number, locale: string = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Error boundary for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Utility to handle API responses
export const handleApiResponse = <T>(response: AxiosResponse<T>): T => {
  if (response.data && typeof response.data === 'object' && 'success' in response.data) {
    const apiResponse = response.data as any;
    if (!apiResponse.success) {
      throw new ApiError(
        apiResponse.error || 'API request failed',
        response.status,
        apiResponse
      );
    }
    return apiResponse.data;
  }
  return response.data;
};
