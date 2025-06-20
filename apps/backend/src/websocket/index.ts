import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { queries } from '@dine-now/database';
import { WS_EVENTS } from '@dine-now/shared';
import config from '../config';
import { logInfo, logError, logWarning } from '../utils/logger';
import { corsOptions } from '../middleware';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: 'customer' | 'staff';
  restaurantId?: string;
  telegramId?: string;
}

interface SocketUser {
  id: string;
  type: 'customer' | 'staff';
  restaurantId?: string;
  rooms: Set<string>;
}

class WebSocketServer {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, SocketUser>();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: corsOptions,
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logInfo('WebSocket server initialized');
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          logWarning('WebSocket connection attempted without token', { 
            socketId: socket.id,
            ip: socket.handshake.address 
          });
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.jwtSecret) as any;
        
        // Check if it's a customer or staff token
        if (decoded.userId) {
          // Customer token
          const customer = await queries.customer.getCustomerById(decoded.userId);
          if (!customer) {
            return next(new Error('Customer not found'));
          }
          
          socket.userId = customer.id;
          socket.userType = 'customer';
          socket.telegramId = customer.telegramId;
          
        } else if (decoded.telegramId) {
          // Staff token
          const staffData = await queries.staff.getStaffByTelegramId(decoded.telegramId);
          if (!staffData) {
            return next(new Error('Staff not found'));
          }
          
          socket.userId = staffData.staff.id;
          socket.userType = 'staff';
          socket.restaurantId = staffData.staff.restaurantId;
          socket.telegramId = staffData.staff.telegramId;
          
        } else {
          return next(new Error('Invalid token'));
        }

        logInfo('WebSocket client authenticated', {
          socketId: socket.id,
          userId: socket.userId,
          userType: socket.userType,
          restaurantId: socket.restaurantId,
        });

        next();
      } catch (error) {
        logError(error as Error, { socketId: socket.id });
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on(WS_EVENTS.CONNECTION, (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    const userType = socket.userType!;
    const restaurantId = socket.restaurantId!;

    logInfo('WebSocket client connected', {
      socketId: socket.id,
      userId,
      userType,
      restaurantId,
    });

    // Store user connection
    this.connectedUsers.set(socket.id, {
      id: userId,
      type: userType,
      restaurantId,
      rooms: new Set(),
    });

    // Auto-join appropriate rooms
    this.autoJoinRooms(socket);

    // Handle room joining
    socket.on(WS_EVENTS.JOIN_ROOM, (data) => {
      this.handleJoinRoom(socket, data);
    });

    // Handle room leaving
    socket.on(WS_EVENTS.LEAVE_ROOM, (data) => {
      this.handleLeaveRoom(socket, data);
    });

    // Handle disconnection
    socket.on(WS_EVENTS.DISCONNECT, (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on(WS_EVENTS.ERROR, (error) => {
      logError(error, { socketId: socket.id, userId });
    });

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected successfully',
      userId,
      userType,
      restaurantId,
    });
  }

  private autoJoinRooms(socket: AuthenticatedSocket) {
    const userType = socket.userType!;
    const userId = socket.userId!;
    const restaurantId = socket.restaurantId;

    if (userType === 'customer') {
      // Customers join their personal room for order updates
      const customerRoom = `customer_${userId}`;
      socket.join(customerRoom);
      this.connectedUsers.get(socket.id)?.rooms.add(customerRoom);
      
      logInfo('Customer auto-joined personal room', {
        socketId: socket.id,
        room: customerRoom,
      });
      
    } else if (userType === 'staff' && restaurantId) {
      // Staff join restaurant room for order updates
      const restaurantRoom = `restaurant_${restaurantId}`;
      socket.join(restaurantRoom);
      this.connectedUsers.get(socket.id)?.rooms.add(restaurantRoom);
      
      // Kitchen staff also join kitchen room
      const kitchenRoom = `kitchen_${restaurantId}`;
      socket.join(kitchenRoom);
      this.connectedUsers.get(socket.id)?.rooms.add(kitchenRoom);
      
      logInfo('Staff auto-joined restaurant rooms', {
        socketId: socket.id,
        rooms: [restaurantRoom, kitchenRoom],
      });
    }
  }

  private handleJoinRoom(socket: AuthenticatedSocket, data: { room: string; password?: string }) {
    const { room, password: _} = data;
    const userId = socket.userId!;
    const userType = socket.userType!;
    
    // Validate room access
    if (!this.canJoinRoom(socket, room)) {
      socket.emit(WS_EVENTS.ERROR, {
        message: 'Access denied to room',
        room,
      });
      return;
    }

    socket.join(room);
    this.connectedUsers.get(socket.id)?.rooms.add(room);
    
    logInfo('User joined room', {
      socketId: socket.id,
      userId,
      userType,
      room,
    });

    socket.emit('room_joined', { room });
  }

  private handleLeaveRoom(socket: AuthenticatedSocket, data: { room: string }) {
    const { room } = data;
    const userId = socket.userId!;

    socket.leave(room);
    this.connectedUsers.get(socket.id)?.rooms.delete(room);
    
    logInfo('User left room', {
      socketId: socket.id,
      userId,
      room,
    });

    socket.emit('room_left', { room });
  }

  private handleDisconnection(socket: AuthenticatedSocket, reason: string) {
    const userId = socket.userId;
    
    logInfo('WebSocket client disconnected', {
      socketId: socket.id,
      userId,
      reason,
    });

    this.connectedUsers.delete(socket.id);
  }

  private canJoinRoom(socket: AuthenticatedSocket, room: string): boolean {
    const userType = socket.userType!;
    const userId = socket.userId!;
    const restaurantId = socket.restaurantId;

    // Customer can only join their own room
    if (userType === 'customer') {
      return room === `customer_${userId}`;
    }

    // Staff can join restaurant and kitchen rooms for their restaurant
    if (userType === 'staff' && restaurantId) {
      return room === `restaurant_${restaurantId}` || 
             room === `kitchen_${restaurantId}` ||
             room.startsWith(`table_${restaurantId}_`);
    }

    return false;
  }

  // Public methods for broadcasting
  public broadcastToRoom(room: string, event: string, data: any) {
    this.io.to(room).emit(event, data);
    
    logInfo('Broadcast sent to room', {
      room,
      event,
      connectedSockets: this.io.sockets.adapter.rooms.get(room)?.size || 0,
    });
  }

  public broadcastToUser(userId: string, userType: 'customer' | 'staff', event: string, data: any) {
    const room = userType === 'customer' ? `customer_${userId}` : `staff_${userId}`;
    this.broadcastToRoom(room, event, data);
  }

  public broadcastToRestaurant(restaurantId: string, event: string, data: any) {
    this.broadcastToRoom(`restaurant_${restaurantId}`, event, data);
  }

  public broadcastToKitchen(restaurantId: string, event: string, data: any) {
    this.broadcastToRoom(`kitchen_${restaurantId}`, event, data);
  }

  public getConnectedUsers(): Array<{ socketId: string; user: SocketUser }> {
    return Array.from(this.connectedUsers.entries()).map(([socketId, user]) => ({
      socketId,
      user,
    }));
  }

  public getStats() {
    const totalConnections = this.io.sockets.sockets.size;
    const usersByType = {
      customer: 0,
      staff: 0,
    };

    this.connectedUsers.forEach(user => {
      usersByType[user.type]++;
    });

    return {
      totalConnections,
      usersByType,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys()),
    };
  }
}

// Global WebSocket instance
let wsServer: WebSocketServer | null = null;

export const initializeWebSocket = (httpServer: HTTPServer): WebSocketServer => {
  wsServer = new WebSocketServer(httpServer);
  return wsServer;
};

export const getWebSocketServer = (): WebSocketServer => {
  if (!wsServer) {
    throw new Error('WebSocket server not initialized');
  }
  return wsServer;
};

// Convenience functions for broadcasting
export const broadcastOrderUpdate = (target: string, event: string, data: any) => {
  if (!wsServer) return;
  
  if (target.startsWith('customer_')) {
    wsServer.broadcastToRoom(target, event, data);
  } else if (target.startsWith('restaurant_') || target.includes('-')) {
    // Handle restaurant ID directly
    wsServer.broadcastToRestaurant(target.replace('restaurant_', ''), event, data);
  } else {
    // Assume it's a restaurant ID
    wsServer.broadcastToRestaurant(target, event, data);
  }
};

export const broadcastKitchenUpdate = (restaurantId: string, event: string, data: any) => {
  if (!wsServer) return;
  wsServer.broadcastToKitchen(restaurantId, event, data);
};

export const notifyCustomer = (customerId: string, event: string, data: any) => {
  if (!wsServer) return;
  wsServer.broadcastToUser(customerId, 'customer', event, data);
};

export default WebSocketServer;
