import { ENVIRONMENT } from '@dine-now/shared';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string[];
  uploadPath: string;
  maxFileSize: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  telegramBotToken: string;
  telegramBotServiceToken: string;
  telegramWebhookUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  logLevel: string;
  enableSwagger: boolean;
  enableMetrics: boolean;
  superAdminTelegramId: string;
}

const nodeEnv = process.env.NODE_ENV || ENVIRONMENT.DEVELOPMENT;
export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: nodeEnv,
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  uploadPath: process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramBotServiceToken: process.env.TELEGRAM_BOT_SERVICE_TOKEN || '',
  telegramWebhookUrl: process.env.TELEGRAM_WEBHOOK_URL || 'http://localhost:3002/webhook',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  logLevel: process.env.LOG_LEVEL || 'info',
  enableSwagger: process.env.ENABLE_SWAGGER === 'true' || nodeEnv === ENVIRONMENT.DEVELOPMENT,
  enableMetrics: process.env.ENABLE_METRICS === 'true',
  superAdminTelegramId: process.env.SUPER_ADMIN_TELEGRAM_ID || '',
};

// Validation
export const validateConfig = () => {
  const required = ['TELEGRAM_BOT_TOKEN', 'JWT_SECRET'];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && config.nodeEnv === ENVIRONMENT.PRODUCTION) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (config.corsOrigin.length === 0) {
    throw new Error('CORS_ORIGIN must be configured');
  }
};

export default config;
