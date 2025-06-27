import { Request, Response, NextFunction } from 'express';
import { validate, parse, SignatureInvalidError, SignatureMissingError } from '@telegram-apps/init-data-node';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { ZodError, ZodSchema } from 'zod/v4';
import { 
  AppError, 
  HTTP_STATUS,
  ERROR_MESSAGES,
  ENVIRONMENT,
  UnauthorizedError,
  NotFoundError,
  UnprocessableError,
  UserType,
  ID,
} from '@dine-now/shared';
import { queries, validateSchema } from '@dine-now/database';
import config from '../config';
import { logError, logWarning } from '../utils/logger';

// Extended Request interface
export interface AuthenticatedRequest extends Request {
  user?: {
    type: UserType;
    telegramId: string;
    firstName: string;
    lastName: string | undefined;
    username: string | undefined;
    // Staff-specific properties
    id?: ID;
    role?: string;
    restaurantId?: ID;
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
  } else if (error instanceof ZodError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: ERROR_MESSAGES.VALIDATION_ERROR,
      details: error.issues
    });
  } else if (error instanceof SignatureMissingError || error instanceof SignatureInvalidError) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: error.name,
      details: error.message
    });
  } else if (error.message.includes('duplicate key')) {
    res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      error: ERROR_MESSAGES.CONFLICT_ERROR,
    });
  } else if (error.message.includes('foreign key')) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: ERROR_MESSAGES.REFERENCE_ERROR,
    });
  } else {
    // Default error
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: config.nodeEnv === ENVIRONMENT.PRODUCTION 
        ? ERROR_MESSAGES.SERVER_ERROR 
        : error.message,
    });
  }
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
      error: ERROR_MESSAGES.RATE_LIMITED,
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
      throw new UnprocessableError(`Unsupported authorization method: ${authType}`);
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
          throw new NotFoundError('No user data in init data');
        }

        req.user = {
          telegramId: user.id.toString(),
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          type: UserType.General,
        };

        return next();
      } catch (error) {
        return next(error);
      }
    default:
      throw new UnauthorizedError();
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
          throw new NotFoundError('Staff not found or inactive');
        }
        
        req.user = {
          telegramId: decoded.telegramId.toString(),
          firstName: staffData.staff.firstName,
          lastName: staffData.staff.lastName ?? undefined,
          username: staffData.staff.username ?? undefined,
          type: UserType.Staff,
          id: staffData.staff.id,
          role: staffData.staff.role,
          restaurantId: staffData.staff.restaurantId,
        };

        return next();
      } catch (error) {
        return next(error);
      }
    default:
      throw new UnauthorizedError(`Access denied`);
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
export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      validateSchema(schema)(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      validateSchema(schema)(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateParams = <T>(schema: ZodSchema<T>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      validateSchema(schema)(req.params);
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
  res.status(HTTP_STATUS.OK).json({
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
