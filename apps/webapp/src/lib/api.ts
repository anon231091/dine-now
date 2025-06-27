import { useEffect } from 'react';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { retrieveRawInitData } from '@telegram-apps/sdk-react';
import toast from 'react-hot-toast';

import { useWebSocketStore, useOrdersStore } from '@/store';
import { WS_EVENTS } from '@dine-now/shared';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add initData in auth header 
  client.interceptors.request.use(
    (config) => {
      const initDataRaw = retrieveRawInitData();
      config.headers.Authorization = `tma ${initDataRaw}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response: AxiosResponse<any>) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        window.location.href = '/';
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const apiClient = createApiClient();

// API Functions with Variants Support
export const api = {
  // Restaurants
  restaurants: {
    getAll: () => apiClient.get('/restaurants'),
    getById: (id: string) => apiClient.get(`/restaurants/${id}`),
    getByTableId: (tableId: string) => apiClient.get(`/restaurants/table/${tableId}`),
    getTables: (id: string) => apiClient.get(`/restaurants/${id}/tables`),
    getKitchenStatus: (id: string) => apiClient.get(`/restaurants/${id}/kitchen-status`),
    getAnalytics: (id: string, params: { dateFrom: string; dateTo: string }) => 
      apiClient.get(`/restaurants/${id}/analytics`, { params }),
  },

  // Menu with Variants Support
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

  // Orders with Variants Support
  orders: {
    create: (data: {
      tableId: string;
      orderItems: Array<{
        menuItemId: string;
        variantId: string; // Now required
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
  });
};

export const useRestaurantByTableId = (tableId: string) => {
  return useQuery({
    queryKey: ['restaurant', 'table', tableId],
    queryFn: () => api.restaurants.getByTableId(tableId),
    enabled: !!tableId,
    retry: 1,
  });
};

export const useKitchenStatus = (restaurantId: string) => {
  return useQuery({
    queryKey: ['kitchen-status', restaurantId],
    queryFn: () => api.restaurants.getKitchenStatus(restaurantId),
    enabled: !!restaurantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Menu hooks with variants support
export const useMenu = (restaurantId: string) => {
  return useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => api.menu.getByRestaurant(restaurantId),
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => {
      // Process menu data to ensure variants are properly structured
      if (data?.data?.data) {
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
    select: (data) => {
      // Ensure variants are properly structured
      if (data?.data?.data?.item) {
        const item = data.data.data.item;
        return {
          ...data,
          data: {
            ...data.data,
            data: {
              ...data.data.data,
              item: {
                ...item,
                variants: item.variants || [],
                defaultVariant: item.variants?.find((v: any) => v.isDefault) || item.variants?.[0]
              }
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
  });
};

export const usePopularItems = (restaurantId: string, options?: { limit?: number; days?: number }) => {
  return useQuery({
    queryKey: ['popular-items', restaurantId, options],
    queryFn: () => api.menu.getPopular(restaurantId, options),
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });
};

// Order hooks with variants support
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.orders.create,
    onSuccess: (response) => {
      toast.success('Order placed successfully!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      return response.data;
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to place order';
      toast.error(errorMessage);
      
      // Log detailed error for debugging
      console.error('Order creation failed:', {
        error: errorMessage,
        details: error.response?.data?.details,
        status: error.response?.status
      });
    },
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.orders.getById(orderId),
    enabled: !!orderId,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
    select: (data) => {
      // Process order data to ensure variants are included
      if (data?.data?.data?.orderItems) {
        return {
          ...data,
          data: {
            ...data.data,
            data: {
              ...data.data.data,
              orderItems: data.data.data.orderItems.map((orderItem: any) => ({
                ...orderItem,
                // Ensure variant information is available
                variant: orderItem.variant || {
                  id: 'unknown',
                  size: 'regular',
                  price: orderItem.orderItem?.unitPrice || 0
                }
              }))
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
  });
};

// WebSocket hook
export const useWebSocket = () => {
  const { setConnected, addMessage } = useWebSocketStore();
  
  useEffect(() => {
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      setConnected(true);
      const initDataRaw = retrieveRawInitData();
      // Authenticate WebSocket connection
      ws.send(JSON.stringify({
        type: 'authenticate',
        initDataRaw,
      }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      addMessage(message);
      
      // Handle specific message types
      if (message.type === WS_EVENTS.ORDER_STATUS_UPDATE) {
        useOrdersStore.getState().updateOrderStatus(
          message.data.orderId,
          message.data.status
        );
        
        // Show notification
        toast.success(`Order status updated: ${message.data.status}`);
      }
    };
    
    ws.onclose = () => {
      setConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, [setConnected, addMessage]);
};
