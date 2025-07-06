import { Request, Response, NextFunction } from 'express';
import { validate, parse, SignatureInvalidError, SignatureMissingError } from '@telegram-apps/init-data-node';
import rateLimit from 'express-rate-limit';
import { ZodError, ZodSchema } from 'zod/v4';
import { 
  AppError, 
  HTTP_STATUS,
  ERROR_MESSAGES,
  ENVIRONMENT,
  UnauthorizedError,
  UnprocessableError,
  UserType,
  ID,
  StaffRole,
  AccessDeniedError,
} from '@dine-now/shared';
import { queries, validateSchema } from '@dine-now/database';
import config from '../config';
import { logError, logWarning } from '../utils/logger';

// Extended Request interface
export interface AuthenticatedRequest extends Request {
  user?: {
    type: UserType;
    telegramId: bigint;
    firstName: string;
    lastName: string | undefined;
    username: string | undefined;
    // Staff-specific properties
    id?: ID;
    role?: StaffRole;
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
  // database error
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
      return authUserMiddleware(req, res, next);
    // case 'Bearer':
    //   return authServiceMiddleware(req, res, next);
    default:
      throw new UnprocessableError(`Unsupported authorization method: ${authType}`);
  }
};

const authUserMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  // We expect passing init data in the Authorization header in the following format:
  // <auth-type> <auth-data>
  // <auth-type> must be "tma", and <auth-data> is Telegram Mini Apps init data.
  const [authType, authData = ''] = (req.headers.authorization || '').split(' ');

  if (authType !== 'tma' || !authData) {
    return next(new UnauthorizedError());
  }

  try { 
    // Telegram Mini App init data validation
    validate(authData, config.telegramBotToken, {
      expiresIn: 3600,
    });

    const { user: userData } = parse(authData);
    if (!userData) {
      throw new UnauthorizedError('No user data in init data');
    }

    req.user = {
      type: 'general',
      telegramId: BigInt(userData.id),
      firstName: userData.first_name,
      lastName: userData.last_name,
      username: userData.username,
    };

    if (userData.id.toString() === config.superAdminTelegramId) {
      req.user.type = 'super_admin';
    } else {
    let staff = await queries.staff.getStaffByTelegramId(req.user.telegramId);
      if (staff) {
        req.user.type = 'staff';
        req.user.id = staff.id;
        req.user.role = staff.role;
        req.user.restaurantId = staff.restaurantId;
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

// export const authServiceMiddleware = async (
//   req: AuthenticatedRequest,
//   _res: Response,
//   next: NextFunction
// ) => {
//   const [authType, token] = (req.headers.authorization || '').split(' ');
//
//   if (authType !== 'Bearer' || !token) {
//     return next(new UnauthorizedError());
//   }
//
//   // Check if it's a service token
//   const serviceTokens = {
//     [config.telegramBotServiceToken]: {
//       type: ServiceType.Bot,
//       permissions: SERVICE_PERMISSIONS,
//     }
//   };
//
//   if (serviceTokens[token]) {
//     req.service = serviceTokens[token];
//     return next();
//   }
//
//   // Otherwise, continue with normal JWT auth
//   return next(new UnauthorizedError());
// };

// Role-based authorization
export const requireRole = (roles: StaffRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (req.user.role && !hasRoleIn(req, roles)) {
      throw new AccessDeniedError('Insufficient permissions');
    }

    next();
  };
};

// Critical action middleware
export const onlySuperAdmin = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  if (!isSuperAdmin(req)) {
    throw new AccessDeniedError();  
  }
  
  next();
}

// Restaurant access middleware
export const requireRestaurantAccess = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  // Staff users must have access to the restaurant
  if (req.user.restaurantId && !hasRestaurantAccess(req, req.params.restaurantId!)) {
    throw new AccessDeniedError('Access denied to this restaurant');
  }

  next();
};

export const requireSuperAdminOrAdminOf = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  if (isSuperAdminOrAdminOf(req, req.params.restaurantId!)) {
    next();
  } else {
    throw new AccessDeniedError();
  }
}

export const isSuperAdmin = (req: AuthenticatedRequest): boolean => {
  return req.user?.type === 'super_admin';
}

export const hasRestaurantAccess = (req: AuthenticatedRequest, restaurantId: ID): boolean => {
  return req.user?.restaurantId === restaurantId;
}

export const isSuperAdminOrAdminOf = (req: AuthenticatedRequest, restaurantId: ID): boolean => {
  return req.user?.type === 'super_admin'
    || (req.user?.role === 'admin'
      && hasRestaurantAccess(req, restaurantId));
}

export const hasRoleIn = (req: AuthenticatedRequest, roles: StaffRole[]): boolean => {
  if (!req.user?.role) return false;
  return roles.includes(req.user.role);
}

// Validation middleware factory
export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      validateSchema(schema)(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      validateSchema(schema)(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateParams = <T>(schema: ZodSchema<T>) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
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
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
