import { Request, Response, NextFunction } from 'express';
import { validate, parse, SignatureInvalidError, SignatureMissingError } from '@telegram-apps/init-data-node';
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
): void => {
  logError(error, {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Handle different error types
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }

  if (error instanceof SharedValidationError || error instanceof ZodError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Validation failed',
      details: error instanceof ZodError ? error.errors : error.message,
    });
  }

  if (error instanceof SignatureMissingError || error instanceof SignatureInvalidError) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }

  if (error.name === 'JsonWebTokenError' || error.message === 'Unauthorized') {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }

  if (error.name === 'MulterError') {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'File upload error',
      details: error.message,
    });
  }

  // Database errors
  if (error.message.includes('duplicate key')) {
    res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      error: 'Duplicate entry',
    });
  }

  if (error.message.includes('foreign key')) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Invalid reference',
    });
  }

  // Default error
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
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
 * Middleware which authorizes the external client for multiple methods 
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // We expect passing init data in the Authorization header in the following format:
  // <auth-type> <auth-data>
  // * general users: <auth-type> must be "tma" and <auth-data> is Telegram Mini Apps init data.
  // * staff users: <auth-type> must be "Bearer" and <auth-data> is JWT token singed by this backend.
  const authType = req.headers.authorization?.split(' ')[0];

  switch (authType) {
    case 'tma': 
      return authGeneralMiddleware(req, res, next);
    case 'Bearer':
      return authStaffMiddleware(req, res, next);
    default:
      throw new Error('Unauthorized');
  }
};

export const authGeneralMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  // We expect passing init data in the Authorization header in the following format:
  // <auth-type> <auth-data>
  // <auth-type> must be "tma", and <auth-data> is Telegram Mini Apps init data.
  const [authType, authData = ''] = (req.headers.authorization || '').split(' ');

  switch (authType) {
    case 'tma':
      try { 
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
      } catch (error) {
        return next(error);
      }
    default:
      throw new Error('Unauthorized');
  }
}

/**
 * Middleware which authorizes the external client for staff user
 */
export const authStaffMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const [authType, authData = ''] = (req.headers.authorization || '').split(' ');

  switch (authType) {
    case 'Bearer': 
      try {
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
      } catch (error) {
        return next(error);
      }
    default:
      throw new Error('Unauthorized');
  }
};

// Role-based authorization
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    if (req.user?.role && !roles.includes(req.user.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
};

// Restaurant access middleware
export const requireRestaurantAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const restaurantId = req.params.restaurantId || req.body.restaurantId;
  
  if (!restaurantId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Restaurant ID is required',
    });
  }

  // Staff users must have access to the restaurant
  if (req.user?.restaurantId && req.user.restaurantId !== restaurantId) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: 'Access denied to this restaurant',
    });
  }

  next();
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
      // const validatedData = schema.parse(req.params);
      // req.params = validatedData;
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
    
    // Log slow requests (removed header setting since response is already sent)
    if (duration > 1000) {
      logWarning('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
      });
    }
  });
  
  next();
};
