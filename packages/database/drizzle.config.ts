import type { Config } from 'drizzle-kit';
import { getDatabaseConfig, createDatabaseUrl } from './src/config';

const config = getDatabaseConfig();
const dbUrl = createDatabaseUrl(config);

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: dbUrl,
  },
  verbose: true,
  strict: true
} satisfies Config;

// Alternative configurations for different environments
export const configs = {
  development: {
    schema: './src/schema/index.ts',
    out: './migrations',
    driver: 'pg',
    dbCredentials: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'password',
      database: 'restaurant_app_dev',
    },
    verbose: true,
    strict: true,
  },
  
  test: {
    schema: './src/schema/index.ts',
    out: './migrations',
    driver: 'pg',
    dbCredentials: {
      host: 'localhost',
      port: 5432,
      user: 'postgres', 
      password: 'password',
      database: 'restaurant_app_test',
    },
    verbose: false,
    strict: true,
  },
  
  production: {
    schema: './src/schema/index.ts',
    out: './migrations',
    driver: 'pg',
    dbCredentials: {
      connectionString: process.env.DATABASE_URL || '',
      ssl: process.env.NODE_ENV === 'production',
    },
    verbose: false,
    strict: true,
  },
} satisfies Record<string, Config>;
