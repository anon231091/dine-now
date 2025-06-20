import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore, useWebSocketStore, useOrdersStore } from '../store';
import { ApiResponse } from '@dine-now/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

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

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        useAuthStore.getState().logout();
        window.location.href = '/auth';
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const apiClient = createApiClient();

// API Functions
export const api = {
  // Authentication
  auth: {
    loginTelegram: (data: {
      telegramId: string;
      firstName: string;
      lastName?: string;
      username?: string;
      hash?: string;
    }) => apiClient.post('/auth/telegram', data),
    
    verify: () => apiClient.get('/auth/verify'),
    refresh: () => apiClient.post('/auth/refresh'),
  },

  // Restaurants
  restaurants: {
    getAll: () => apiClient.get('/restaurants'),
    getById: (id: string) => apiClient.get(`/restaurants/${id}`),
    getByQR: (qrCode: string) => apiClient.get(`/restaurants/table/qr/${qrCode}`),
    getTables: (id: string) => apiClient.get(`/restaurants/${id}/tables`),
    getKitchenStatus: (id: string) => apiClient.get(`/restaurants/${id}/kitchen-status`),
    getAnalytics: (id: string, params: { dateFrom: string; dateTo: string }) => 
      apiClient.get(`/restaurants/${id}/analytics`, { params }),
  },

  // Menu
  menu: {
    getByRestaurant: (restaurantId: string) => 
      apiClient.get(`/menu/${restaurantId}`),
    search: (restaurantId: string, params: any) => 
      apiClient.get(`/menu/${restaurantId}/search`, { params }),
    getItem: (itemId: string) => 
      apiClient.get(`/menu/item/${itemId}`),
    getCategories: (restaurantId: string) => 
      apiClient.get(`/menu/${restaurantId}/categories`),
    getPopular: (restaurantId: string, params?: { limit?: number; days?: number }) => 
      apiClient.get(`/menu/${restaurantId}/popular`, { params }),
  },

  // Orders
  orders: {
    create: (data: {
      tableId: string;
      orderItems: Array<{
        menuItemId: string;
        quantity: number;
        size?: string;
        spiceLevel?: string;
        notes?: string;
      }>;
      notes?: string;
    }) => apiClient.post('/orders', data),
    
    getById: (id: string) => apiClient.get(`/orders/${id}`),
    getHistory: (params?: { page?: number; limit?: number }) => 
      apiClient.get('/orders/customer/history', { params }),
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

export const useRestaurantByQR = (qrCode: string) => {
  return useQuery({
    queryKey: ['restaurant', 'qr', qrCode],
    queryFn: () => api.restaurants.getByQR(qrCode),
    enabled: !!qrCode,
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

// Menu hooks
export const useMenu = (restaurantId: string) => {
  return useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => api.menu.getByRestaurant(restaurantId),
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useMenuItem = (itemId: string) => {
  return useQuery({
    queryKey: ['menu-item', itemId],
    queryFn: () => api.menu.getItem(itemId),
    enabled: !!itemId,
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

// Order hooks
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
      toast.error(error.response?.data?.error || 'Failed to place order');
    },
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.orders.getById(orderId),
    enabled: !!orderId,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });
};

export const useOrderHistory = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['order-history', params],
    queryFn: () => api.orders.getHistory(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Authentication hooks
export const useAuth = () => {
  const queryClient = useQueryClient();
  
  const login = useMutation({
    mutationFn: api.auth.loginTelegram,
    onSuccess: (response) => {
      const { user, token } = response.data.data;
      useAuthStore.getState().login(user, token);
      toast.success(`Welcome ${user.firstName}!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Authentication failed');
    },
  });

  const verify = useQuery({
    queryKey: ['auth-verify'],
    queryFn: api.auth.verify,
    enabled: !!useAuthStore.getState().token,
    retry: false,
    onError: () => {
      useAuthStore.getState().logout();
    },
  });

  return {
    login,
    verify,
    logout: () => {
      useAuthStore.getState().logout();
      queryClient.clear();
      toast.success('Logged out successfully');
    },
  };
};

// WebSocket hook
export const useWebSocket = () => {
  const { token } = useAuthStore();
  const { setConnected, addMessage } = useWebSocketStore();
  
  useEffect(() => {
    if (!token) return;
    
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      setConnected(true);
      // Authenticate WebSocket connection
      ws.send(JSON.stringify({
        type: 'authenticate',
        token,
      }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      addMessage(message);
      
      // Handle specific message types
      if (message.type === 'order_status_update') {
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
  }, [token, setConnected, addMessage]);
};
