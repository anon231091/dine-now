import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from "pg";
import * as schema from '../schema';

// Database configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
}

// Get database configuration from environment
export const getDatabaseConfig = (): DatabaseConfig => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'restaurant_app',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
});

// Create database URL from config
export const createDatabaseUrl = (config: DatabaseConfig): string => {
  const sslParam = config.ssl ? '?sslmode=require' : '';
  return `postgres://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${sslParam}`;
};

// Create postgres client
export const createPostgresClient = (config: DatabaseConfig) => {
  const url = createDatabaseUrl(config);

  return new Pool({
    connectionString: url,
    max: config.maxConnections,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    idleTimeoutMillis: config.idleTimeoutMillis,
  });
};

// Create drizzle instance
export const createDatabase = (config?: DatabaseConfig) => {
  const dbConfig = config || getDatabaseConfig();
  const client = createPostgresClient(dbConfig);
  
  return drizzle(client, { 
    schema,
    logger: process.env.NODE_ENV === 'development',
  });
};

// Default database instance
let db: ReturnType<typeof createDatabase> | null = null;

export const getDatabase = () => {
  if (!db) {
    db = createDatabase();
  }
  return db;
};

// Database health check
export const checkDatabaseHealth = async (): Promise<{ healthy: boolean; error?: string }> => {
  try {
    const database = getDatabase();
    await database.execute('SELECT 1');
    return { healthy: true };
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    };
  }
};

// Close database connection
export const closeDatabaseConnection = async () => {
  // Note: postgres-js handles connection pooling and cleanup automatically
  db = null;
};

// Migration utilities
export const runMigrations = async () => {
  // This would typically use drizzle-kit migrate command
  // For now, we'll provide a helper to run SQL files
  console.log('Run migrations using: npm run db:migrate');
};

// Transaction helper
export const withTransaction = async <T>(
  callback: (tx: Parameters<Parameters<ReturnType<typeof getDatabase>['transaction']>[0]>[0]) => Promise<T>
): Promise<T> => {
  const database = getDatabase();
  return database.transaction(callback);
};

// Query helpers
export const executeRawQuery = async (sql: string, _params?: any[]) => {
  const database = getDatabase();
  return database.execute(sql);
};

// Environment-specific configurations
export const environments = {
  development: {
    host: 'localhost',
    port: 5432,
    database: 'restaurant_app_dev',
    username: 'postgres',
    password: 'password',
    ssl: false,
    maxConnections: 5,
  },
  test: {
    host: 'localhost',
    port: 5432,
    database: 'restaurant_app_test',
    username: 'postgres',
    password: 'password',
    ssl: false,
    maxConnections: 2,
  },
  staging: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'restaurant_app_staging',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: true,
    maxConnections: 10,
  },
  production: {
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || '',
    username: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    ssl: true,
    maxConnections: 20,
  },
} as const;

// Get config for current environment
export const getEnvironmentConfig = (env: string = process.env.NODE_ENV || 'development'): DatabaseConfig => {
  if (env in environments) {
    return environments[env as keyof typeof environments];
  }
  return environments.development;
};

// Connection pool monitoring
export interface ConnectionPoolStats {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
}

// Note: postgres-js doesn't expose pool stats directly
// This is a placeholder for monitoring implementation
export const getConnectionPoolStats = (): ConnectionPoolStats => {
  return {
    totalConnections: 0,
    idleConnections: 0,
    activeConnections: 0,
  };
};
