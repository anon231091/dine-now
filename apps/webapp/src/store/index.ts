import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Restaurant, 
  Table, 
  MenuItem, 
  Order, 
  SpiceLevel,
  ItemSize 
} from '@dine-now/shared';

// Restaurant Store
interface RestaurantState {
  currentRestaurant: Restaurant | null;
  currentTable: Table | null;
  setRestaurant: (restaurant: Restaurant) => void;
  setTable: (table: Table) => void;
  clearRestaurant: () => void;
}

export const useRestaurantStore = create<RestaurantState>()(
  persist(
    (set) => ({
      currentRestaurant: null,
      currentTable: null,
      
      setRestaurant: (restaurant) => set({ currentRestaurant: restaurant }),
      setTable: (table) => set({ currentTable: table }),
      clearRestaurant: () => set({ 
        currentRestaurant: null, 
        currentTable: null 
      }),
    }),
    {
      name: 'restaurant-storage',
    }
  )
);

// Cart Store
interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  size?: ItemSize;
  spiceLevel?: SpiceLevel;
  notes?: string;
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  totalAmount: number;
  estimatedTime: number;
  addItem: (item: Omit<CartItem, 'subtotal'>) => void;
  updateItem: (index: number, updates: Partial<CartItem>) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  getCartSummary: () => {
    totalItems: number;
    totalAmount: number;
    estimatedTime: number;
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalAmount: 0,
  estimatedTime: 0,
  
  addItem: (item) => {
    const subtotal = item.menuItem.price * item.quantity;
    const newItem: CartItem = { ...item, subtotal };
    
    set((state) => {
      const newItems = [...state.items, newItem];
      const totalAmount = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const estimatedTime = Math.max(...newItems.map(item => 
        item.menuItem.preparationTimeMinutes * (item.quantity > 1 ? 1.3 : 1)
      ));
      
      return {
        items: newItems,
        totalAmount,
        estimatedTime,
      };
    });
  },
  
  updateItem: (index, updates) => {
    set((state) => {
      const newItems = [...state.items];
      const item = newItems[index];
      
      if (item) {
        const updatedItem = { ...item, ...updates };
        if (updates.quantity || updates.menuItem) {
          updatedItem.subtotal = updatedItem.menuItem.price * updatedItem.quantity;
        }
        newItems[index] = updatedItem;
        
        const totalAmount = newItems.reduce((sum, item) => sum + item.subtotal, 0);
        const estimatedTime = Math.max(...newItems.map(item => 
          item.menuItem.preparationTimeMinutes * (item.quantity > 1 ? 1.3 : 1)
        ));
        
        return {
          items: newItems,
          totalAmount,
          estimatedTime,
        };
      }
      
      return state;
    });
  },
  
  removeItem: (index) => {
    set((state) => {
      const newItems = state.items.filter((_, i) => i !== index);
      const totalAmount = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const estimatedTime = newItems.length > 0 
        ? Math.max(...newItems.map(item => 
            item.menuItem.preparationTimeMinutes * (item.quantity > 1 ? 1.3 : 1)
          ))
        : 0;
      
      return {
        items: newItems,
        totalAmount,
        estimatedTime,
      };
    });
  },
  
  clearCart: () => set({ 
    items: [], 
    totalAmount: 0, 
    estimatedTime: 0 
  }),
  
  getCartSummary: () => {
    const state = get();
    return {
      totalItems: state.items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: state.totalAmount,
      estimatedTime: state.estimatedTime,
    };
  },
}));

// Orders Store
interface OrdersState {
  currentOrder: Order | null;
  orderHistory: Order[];
  setCurrentOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  addToHistory: (order: Order) => void;
  clearCurrentOrder: () => void;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      currentOrder: null,
      orderHistory: [],
      
      setCurrentOrder: (order) => set({ currentOrder: order }),
      
      updateOrderStatus: (orderId, status) => {
        set((state) => {
          let updatedCurrentOrder = state.currentOrder;
          if (state.currentOrder?.id === orderId) {
            updatedCurrentOrder = { ...state.currentOrder, status };
          }
          
          const updatedHistory = state.orderHistory.map(order =>
            order.id === orderId ? { ...order, status } : order
          );
          
          return {
            currentOrder: updatedCurrentOrder,
            orderHistory: updatedHistory,
          };
        });
      },
      
      addToHistory: (order) => {
        set((state) => ({
          orderHistory: [order, ...state.orderHistory.filter(o => o.id !== order.id)],
        }));
      },
      
      clearCurrentOrder: () => set({ currentOrder: null }),
    }),
    {
      name: 'orders-storage',
    }
  )
);

// UI Store
interface UIState {
  isLoading: boolean;
  currentPage: string;
  showCart: boolean;
  setLoading: (loading: boolean) => void;
  setCurrentPage: (page: string) => void;
  toggleCart: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isLoading: false,
      currentPage: '/',
      showCart: false,
      setLoading: (loading) => set({ isLoading: loading }),
      setCurrentPage: (page) => set({ currentPage: page }),
      toggleCart: () => set((state) => ({ showCart: !state.showCart })),
    }),
    {
      name: 'ui-storage',
    }
  )
);

// WebSocket Store
interface WebSocketState {
  isConnected: boolean;
  messages: any[];
  setConnected: (connected: boolean) => void;
  addMessage: (message: any) => void;
  clearMessages: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  isConnected: false,
  messages: [],
  
  setConnected: (connected) => set({ isConnected: connected }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  clearMessages: () => set({ messages: [] }),
}));
