import { Request, Response, NextFunction } from 'express';
import { validate, parse } from '@telegram-apps/init-data-node';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { 
  AppError, 
  ValidationError as SharedValidationError,
  HTTP_STATUS,
  ERROR_MESSAGES 
} from '@dine-now/shared';
import { queries } from '@dine-now/database';
import config from '../config';
import { logError, logWarning } from '../utils/logger';

// Extended Request interface
export interface AuthenticatedRequest extends Request {
  user?: {
    type: 'customer' | 'staff';
    telegramId: string;
    firstName: string;
    lastName: string | undefined;
    username: string | undefined;
    // Staff-specific properties
    id?: string;
    role?: string;
    restaurantId?: string;
  };
  restaurant?: {
    id: string;
    name: string;
  };
}

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logError(error, {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Handle different error types
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }

  if (error instanceof SharedValidationError || error instanceof ZodError) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Validation failed',
      details: error instanceof ZodError ? error.errors : error.message,
    });
  }

  if (error.name === 'JsonWebTokenError' || error.message === 'Unauthorized') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }

  if (error.name === 'MulterError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'File upload error',
      details: error.message,
    });
  }

  // Database errors
  if (error.message.includes('duplicate key')) {
    return res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      error: 'Duplicate entry',
    });
  }

  if (error.message.includes('foreign key')) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Invalid reference',
    });
  }

  // Default error
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: config.nodeEnv === 'production' 
      ? ERROR_MESSAGES.SERVER_ERROR 
      : error.message,
  });
};

// Not found middleware
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`,
  });
};

// Rate limiting
export const createRateLimit = (windowMs?: number, max?: number) => {
  return rateLimit({
    windowMs: windowMs || config.rateLimitWindowMs,
    max: max || config.rateLimitMax,
    message: {
      success: false,
      error: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Middleware which authorizes the external client using multiple methods
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  // Skip auth for public routes
  const publicRoutes = ['/health', '/api-docs', '/api/auth'];
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new Error('Unauthorized'));
  }

  const [authType, authData = ''] = authHeader.split(' ');

  try {
    switch (authType) {
      case 'tma': {
        // Telegram Mini App init data validation
        validate(authData, config.telegramBotToken, {
          expiresIn: 3600,
        });

        const { user } = parse(authData);
        if (!user) {
          throw new Error('No user data in init data');
        }

        req.user = {
          telegramId: user.id.toString(),
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          type: 'customer',
        };

        return next();
      }
      
      case 'Bearer': {
        // JWT token validation
        const decoded = jwt.verify(authData, config.jwtSecret) as any;

        // For staff, verify they still exist and are active
        const staffData = await queries.staff.getStaffByTelegramId(BigInt(decoded.telegramId));
        if (!staffData || !staffData.staff.isActive) {
          throw new Error('Staff not found or inactive');
        }
        
        req.user = {
          telegramId: decoded.telegramId.toString(),
          firstName: staffData.staff.firstName,
          lastName: staffData.staff.lastName ?? undefined,
          username: staffData.staff.username ?? undefined,
          type: 'staff',
          id: staffData.staff.id,
          role: staffData.staff.role,
          restaurantId: staffData.staff.restaurantId,
        };

        req.restaurant = {
          id: staffData.restaurant.id,
          name: staffData.restaurant.name,
        };

        return next();
      }
      
      default:
        throw new Error('Invalid auth type');
    }
  } catch (error) {
    return next(new Error('Unauthorized'));
  }
};

// Customer authentication middleware
export const authenticateCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.type !== 'customer') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Customer authentication required',
    });
  }
  return next();
};

// Staff authentication middleware
export const authenticateStaff = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.type !== 'staff') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Staff authentication required',
    });
  }
  return next();
};

// Role-based authorization
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    return next();
  };
};

// Restaurant access middleware
export const requireRestaurantAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const restaurantId = req.params.restaurantId || req.body.restaurantId;
  
  if (!restaurantId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Restaurant ID is required',
    });
  }

  // Staff users must have access to the restaurant
  if (req.user?.restaurantId && req.user.restaurantId !== restaurantId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: 'Access denied to this restaurant',
    });
  }

  return next();
};

// Validation middleware factory
export const validateBody = (schema: any) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateQuery = (schema: any) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateParams = (schema: any) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Async middleware wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// CORS middleware
export const corsOptions = {
  origin: config.corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-API-Key',
  ],
};

// Health check middleware
export const healthCheck = (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
};

// Request timing middleware
export const requestTiming = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    if (duration > 1000) {
      logWarning('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
      });
    }
  });
  
  next();
};
