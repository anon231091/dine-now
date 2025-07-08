import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { validate, parse } from '@telegram-apps/init-data-node';
import { queries } from '@dine-now/database';
import { ID, NotFoundError, StaffRole, TelegramId, UnauthorizedError, UserType, WS_EVENTS } from '@dine-now/shared';
import config from '../config';
import { logInfo, logError, logWarning } from '../utils/logger';
import { corsOptions } from '../middleware';

const CUSTOMER_ROOM_PREFIX: string = 'customer_';
const STAFF_ROOM_PREFIX: string = 'staff_';
const KITCHEN_ROOM_PREFIX: string = 'kitchen_';
const SERVICE_ROOM_PREFIX: string = 'service_';
const RESTAURANT_ROOM_PREFIX: string = 'restaurant_';

interface AuthenticatedSocket extends Socket {
  userType: UserType;
  userId: TelegramId; 
  role?: StaffRole;
  restaurantId?: ID;
}

interface SocketUser {
  id: TelegramId;
  type: UserType;
  restaurantId?: ID;
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
    this.io.use(async (socket: any, next) => {
      try {
        // Check for token in handshake auth
        const initDataRaw = socket.handshake.auth.initDataRaw || socket.handshake.headers.authorization?.split(' ')[1];

        if (initDataRaw) {
          // Telegram init data authentication
          validate(initDataRaw, config.telegramBotToken, {
            expiresIn: 3600,
          });

          const { user } = parse(initDataRaw);
          if (!user) {
            return next(new NotFoundError('No user data in init data'));
          }

          socket.userType = 'general';
          socket.userId = BigInt(user.id);

          let staff = await queries.staff.getStaffByTelegramId(socket.userId);
          if (staff) {
            socket.userType = 'staff';
            socket.role = staff.role;
            socket.restaurantId = staff.restaurantId;
          }
        } else {
          logWarning('WebSocket connection attempted without authentication', { 
            socketId: socket.id,
            ip: socket.handshake.address 
          });
          return next(new UnauthorizedError());
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
        next(new UnauthorizedError());
      }
    });
  }

  private setupEventHandlers() {
    this.io.on(WS_EVENTS.CONNECTION, (socket: any) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket) {
    const userId = socket.userId;
    const userType = socket.userType;
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

    // Handle authentication message (for runtime auth changes)
    socket.on(WS_EVENTS.AUTHENTICATE, async (data) => {
      try {
        if (data.initDataRaw) {
          // Re-authenticate with Telegram init data
          validate(data.initDataRaw, config.telegramBotToken, {
            expiresIn: 3600, // 1hr
          });

          const { user } = parse(data.initDataRaw);
          if (user) {
            socket.userType = 'general';
            socket.userId = BigInt(user.id);

            let staff = await queries.staff.getStaffByTelegramId(socket.userId);
            if (staff) {
              socket.userType = 'staff';
              socket.role = staff.role;
              socket.restaurantId = staff.restaurantId;
            }
            this.updateUserConnection(socket);
            this.autoJoinRooms(socket);
          }
        }

        socket.emit(WS_EVENTS.AUTHENTICATED, {
          success: true,
          userId: socket.userId,
          userType: socket.userType,
        });

      } catch (error) {
        logError(error as Error, { socketId: socket.id });
        socket.emit(WS_EVENTS.AUTHENTICATED, {
          success: false,
          error: 'Authentication failed',
        });
      }
    });

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
    socket.emit(WS_EVENTS.CONNECTED, {
      message: 'Connected successfully',
      userId,
      userType,
      restaurantId,
    });
  }

  private updateUserConnection(socket: AuthenticatedSocket) {
    const userId = socket.userId;
    const userType = socket.userType;
    const restaurantId = socket.restaurantId!;

    this.connectedUsers.set(socket.id, {
      id: userId,
      type: userType,
      restaurantId,
      rooms: new Set(),
    });
  }

  private autoJoinRooms(socket: AuthenticatedSocket) {
    const userType = socket.userType;
    const userId = socket.userId;
    const staffRole = socket.role!;
    const restaurantId = socket.restaurantId;

    if (userType === 'general') {
      // Customers join their personal room for order updates
      const customerRoom = `${CUSTOMER_ROOM_PREFIX}${userId}`;
      socket.join(customerRoom);
      this.connectedUsers.get(socket.id)?.rooms.add(customerRoom);
      
      logInfo('Customer auto-joined personal room', {
        socketId: socket.id,
        room: customerRoom,
      });
      
    } else if (userType === 'staff' && restaurantId) {
      switch (staffRole) {
        case 'admin':
        case 'manager':
          // admin and manager join restaurant room for order updates
          const restaurantRoom = `${RESTAURANT_ROOM_PREFIX}${restaurantId}`;
          socket.join(restaurantRoom);
          this.connectedUsers.get(socket.id)?.rooms.add(restaurantRoom);
          
          logInfo('Admin or manager auto-joined restaurant rooms', {
            socketId: socket.id,
            rooms: [restaurantRoom],
          });
          break;
        case 'kitchen': 
          // Kitchen staff join kitchen room
          const kitchenRoom = `${KITCHEN_ROOM_PREFIX}${restaurantId}`;
          socket.join(kitchenRoom);
          this.connectedUsers.get(socket.id)?.rooms.add(kitchenRoom);
          
          logInfo('Kitchen staff auto-joined restaurant rooms', {
            socketId: socket.id,
            rooms: [kitchenRoom],
          });
          break;
        case 'service':
          // Service staff join service room
          const serviceRoom = `${SERVICE_ROOM_PREFIX}${restaurantId}`;
          socket.join(serviceRoom);
          this.connectedUsers.get(socket.id)?.rooms.add(serviceRoom);
          
          logInfo('Service staff auto-joined restaurant rooms', {
            socketId: socket.id,
            rooms: [serviceRoom],
          });
          break;
      }
    }
  }

  private handleJoinRoom(socket: AuthenticatedSocket, data: { room: string; password?: string }) {
    const { room } = data;
    const userId = socket.userId;
    const userType = socket.userType;
    
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
    const userId = socket.userId;

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
    const userType = socket.userType;
    const userId = socket.userId;
    const staffRole = socket.role!;
    const restaurantId = socket.restaurantId;

    // Customer can only join their own room
    if (userType === 'general') {
      return room === `${CUSTOMER_ROOM_PREFIX}${userId}`;
    }

    // Staff can join restaurant and kitchen rooms for their restaurant
    if (userType === 'staff' && restaurantId) {
      return (['admin', 'manager'].includes(staffRole) && room === `${RESTAURANT_ROOM_PREFIX}${restaurantId}`) || 
             (staffRole === 'kitchen' && room === `${KITCHEN_ROOM_PREFIX}${restaurantId}`) ||
             (staffRole === 'service' && room === `${SERVICE_ROOM_PREFIX}${restaurantId}`);
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

  public broadcastToUser(userId: TelegramId, userType: UserType, event: string, data: any) {
    const room = userType === 'general' ? `${CUSTOMER_ROOM_PREFIX}${userId}` : `${STAFF_ROOM_PREFIX}${userId}`;
    this.broadcastToRoom(room, event, data);
  }

  public broadcastToRestaurant(restaurantId: ID, event: string, data: any) {
    this.broadcastToRoom(`${RESTAURANT_ROOM_PREFIX}${restaurantId}`, event, data);
  }

  public broadcastToKitchen(restaurantId: ID, event: string, data: any) {
    this.broadcastToRoom(`${KITCHEN_ROOM_PREFIX}${restaurantId}`, event, data);
  }

  public broadcastToService(restaurantId: ID, event: string, data: any) {
    this.broadcastToRoom(`${SERVICE_ROOM_PREFIX}${restaurantId}`, event, data);
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
      general: 0,
      staff: 0,
      super_admin: 0,
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

export const broadcastKitchenUpdate = (restaurantId: ID, event: string, data: any) => {
  if (!wsServer) return;
  wsServer.broadcastToKitchen(restaurantId, event, data);
};

export const broadcastServiceUpdate = (restaurantId: ID, event: string, data: any) => {
  if (!wsServer) return;
  wsServer.broadcastToService(restaurantId, event, data);
};

export const broadcastRestaurantUpdate = (restaurantId: ID, event: string, data: any) => {
  if (!wsServer) return;
  wsServer.broadcastToRestaurant(restaurantId, event, data);
};

export const notifyCustomer = (customerId: TelegramId, event: string, data: any) => {
  if (!wsServer) return;
  wsServer.broadcastToUser(customerId, 'general', event, data);
};

export default WebSocketServer;
