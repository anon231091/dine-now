import express, { Express } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { checkDatabaseHealth, closeDatabaseConnection } from '@dine-now/database';

// Import configuration and utilities
import config, { validateConfig } from './config';
import { logger, requestLogger } from './utils/logger';
import { 
  errorHandler, 
  createRateLimit,
  corsOptions,
  healthCheck,
  requestTiming,
  authMiddleware,
} from './middleware';

// Import routes
import apiRoutes from './routes';

// Import WebSocket
import { initializeWebSocket } from './websocket';
import { ENVIRONMENT, HTTP_STATUS } from '@dine-now/shared';

// Create Express app
const app: Express = express();
const httpServer = createServer(app);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurant Ordering API',
      version: '1.0.0',
      description: 'API for restaurant ordering system with Telegram Mini App integration',
      contact: {
        name: 'Restaurant App Team',
        email: 'dev@restaurant-app.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.restaurant-app.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

// Initialize WebSocket
const wsServer = initializeWebSocket(httpServer);

// Middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.nodeEnv === ENVIRONMENT.DEVELOPMENT) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}
app.use(requestLogger);
app.use(requestTiming);

// Rate limiting
app.use('/api/', createRateLimit());

// Health check endpoint
app.get('/health', healthCheck);

// Database health check
app.get('/health/db', async (_req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    if (dbHealth.healthy) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Database is healthy',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Database is unhealthy',
        error: dbHealth.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Database health check failed',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// WebSocket status endpoint
app.get('/health/ws', (_req, res) => {
  const stats = wsServer.getStats();
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'WebSocket server is healthy',
    stats,
    timestamp: new Date().toISOString(),
  });
});

// API Documentation with Swagger
if (config.enableSwagger) {
  const specs = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Restaurant API Documentation',
  }));
  
  // JSON endpoint for API spec
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}

// API info endpoint
app.get('/api', (_req, res) => {
  res.json({
    success: true,
    message: 'Restaurant Ordering API',
    version: '1.0.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      databaseHealth: '/health/db',
      websocketHealth: '/health/ws',
      documentation: config.enableSwagger ? '/api-docs' : null,
      restaurants: '/api/restaurants',
      menu: '/api/menu',
      orders: '/api/orders',
      kitchen: '/api/kitchen'
    },
  });
});

// API Routes
app.use('/api', authMiddleware, apiRoutes);

// Global error handler
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  httpServer.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    closeDatabaseConnection();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after 30 seconds');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
    
// Start server
const startServer = async () => {
  try {
    // Validate configuration
    validateConfig();
    
    // Check database connection
    const dbHealth = await checkDatabaseHealth();
    if (!dbHealth.healthy) {
      throw new Error(`Database connection failed: ${dbHealth.error}`);
    }
    
    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📖 Environment: ${config.nodeEnv}`);
      logger.info(`💾 Database: Connected`);
      logger.info(`🔌 WebSocket: Running`);
      
      if (config.enableSwagger) {
        logger.info(`📚 API Docs: http://localhost:${config.port}/api-docs`);
      }
      
      logger.info(`✅ Restaurant Ordering API is ready!`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
