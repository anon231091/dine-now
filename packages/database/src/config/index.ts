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
  
  console.log("db config: ", dbConfig);
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
