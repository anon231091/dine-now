import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { validate, parse } from '@telegram-apps/init-data-node';
import { queries } from '@dine-now/database';
import { ID, NotFoundError, UnauthorizedError, UnprocessableError, UserType, WS_EVENTS } from '@dine-now/shared';
import config from '../config';
import { logInfo, logError, logWarning } from '../utils/logger';
import { corsOptions } from '../middleware';

export const CUSTOMER_ROOM_PREFIX: string = 'customer_';
export const STAFF_ROOM_PREFIX: string = 'staff_';
export const KITCHEN_ROOM_PREFIX: string = 'kitchen_';
export const RESTAURANT_ROOM_PREFIX: string = 'restaurant_';
export const TABLE_ROOM_PREFIX: string = 'table_';

interface AuthenticatedSocket extends Socket {
  userType: UserType;
  userId?: ID; // staff
  restaurantId?: ID;
  telegramId?: string; // customer
}

interface SocketUser {
  id: ID;
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
        const token = socket.handshake.auth.token;
        const initDataRaw = socket.handshake.auth.initDataRaw || socket.handshake.headers.authorization?.split(' ')[1];

        if (token) {
          // JWT token authentication
          const decoded = jwt.verify(token, config.jwtSecret) as any;
          
          if (decoded.staffId) {
            const staffData = await queries.staff.getStaffByTelegramId(decoded.telegramId);
            if (!staffData || !staffData.staff.isActive) {
              return next(new NotFoundError('Staff not found or inactive'));
            }
            
            socket.userType = UserType.Staff;
            socket.userId = staffData.staff.id;
            socket.restaurantId = staffData.staff.restaurantId;
            socket.telegramId = staffData.staff.telegramId.toString();
            
          } else {
            return next(new UnprocessableError('Invalid token'));
          }
        } else if (initDataRaw) {
          // Telegram init data authentication
          validate(initDataRaw, config.telegramBotToken, {
            expiresIn: 3600,
          });

          const { user } = parse(initDataRaw);
          if (!user) {
            return next(new NotFoundError('No user data in init data'));
          }

          socket.userType = UserType.General;
          socket.telegramId = user.id.toString();

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
    const userId = socket.userId || socket.telegramId;
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
      id: userId!,
      type: userType,
      restaurantId,
      rooms: new Set(),
    });

    // Auto-join appropriate rooms
    this.autoJoinRooms(socket);

    // Handle authentication message (for runtime auth changes)
    socket.on(WS_EVENTS.AUTHENTICATE, async (data) => {
      try {
        if (data.token) {
          // Re-authenticate with JWT token
          const decoded = jwt.verify(data.token, config.jwtSecret) as any;
          
          if (decoded.staffId) {
            const staffData = await queries.staff.getStaffByTelegramId(decoded.telegramId);
            if (staffData && staffData.staff.isActive) {
              socket.userId = staffData.staff.id;
              socket.userType = UserType.Staff;
              socket.restaurantId = staffData.staff.restaurantId;
              socket.telegramId = staffData.staff.telegramId.toString();
              this.updateUserConnection(socket);
              this.autoJoinRooms(socket);
            }
          }
        } else if (data.initDataRaw) {
          // Re-authenticate with Telegram init data
          validate(data.initDataRaw, config.telegramBotToken, {
            expiresIn: 3600, // 1hr
          });

          const { user } = parse(data.initDataRaw);
          if (user) {
            socket.userType = UserType.General;
            socket.telegramId = user.id.toString();
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
    const userId = socket.userId || socket.telegramId;
    const userType = socket.userType;
    const restaurantId = socket.restaurantId!;

    this.connectedUsers.set(socket.id, {
      id: userId!,
      type: userType,
      restaurantId,
      rooms: new Set(),
    });
  }

  private autoJoinRooms(socket: AuthenticatedSocket) {
    const userType = socket.userType!;
    const userId = socket.userId!;
    const restaurantId = socket.restaurantId;

    if (userType === UserType.General) {
      // Customers join their personal room for order updates
      const customerRoom = `${CUSTOMER_ROOM_PREFIX}${userId}`;
      socket.join(customerRoom);
      this.connectedUsers.get(socket.id)?.rooms.add(customerRoom);
      
      logInfo('Customer auto-joined personal room', {
        socketId: socket.id,
        room: customerRoom,
      });
      
    } else if (userType === UserType.Staff && restaurantId) {
      // Staff join restaurant room for order updates
      const restaurantRoom = `${RESTAURANT_ROOM_PREFIX}${restaurantId}`;
      socket.join(restaurantRoom);
      this.connectedUsers.get(socket.id)?.rooms.add(restaurantRoom);
      
      // Kitchen staff also join kitchen room
      const kitchenRoom = `${KITCHEN_ROOM_PREFIX}${restaurantId}`;
      socket.join(kitchenRoom);
      this.connectedUsers.get(socket.id)?.rooms.add(kitchenRoom);
      
      logInfo('Staff auto-joined restaurant rooms', {
        socketId: socket.id,
        rooms: [restaurantRoom, kitchenRoom],
      });
    }
  }

  private handleJoinRoom(socket: AuthenticatedSocket, data: { room: string; password?: string }) {
    const { room } = data;
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
    if (userType === UserType.General) {
      return room === `${CUSTOMER_ROOM_PREFIX}${userId}`;
    }

    // Staff can join restaurant and kitchen rooms for their restaurant
    if (userType === UserType.Staff && restaurantId) {
      return room === `${RESTAURANT_ROOM_PREFIX}${restaurantId}` || 
             room === `${KITCHEN_ROOM_PREFIX}${restaurantId}` ||
             room.startsWith(`${TABLE_ROOM_PREFIX}${restaurantId}_`);
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

  public broadcastToUser(userId: ID, userType: UserType, event: string, data: any) {
    const room = userType === UserType.General ? `${CUSTOMER_ROOM_PREFIX}${userId}` : `${STAFF_ROOM_PREFIX}${userId}`;
    this.broadcastToRoom(room, event, data);
  }

  public broadcastToRestaurant(restaurantId: ID, event: string, data: any) {
    this.broadcastToRoom(`${RESTAURANT_ROOM_PREFIX}${restaurantId}`, event, data);
  }

  public broadcastToKitchen(restaurantId: ID, event: string, data: any) {
    this.broadcastToRoom(`${KITCHEN_ROOM_PREFIX}${restaurantId}`, event, data);
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
  
  if (target.startsWith(CUSTOMER_ROOM_PREFIX)) {
    wsServer.broadcastToRoom(target, event, data);
  } else if (target.startsWith(RESTAURANT_ROOM_PREFIX) || target.includes('-')) {
    // Handle restaurant ID directly
    wsServer.broadcastToRestaurant(target.replace(RESTAURANT_ROOM_PREFIX, ''), event, data);
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
  wsServer.broadcastToUser(customerId, UserType.General, event, data);
};

export default WebSocketServer;
