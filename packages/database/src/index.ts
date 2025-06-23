// Export schema
export * from './schema';

// Export configuration
export * from './config';

// Export seed functions
export * from './seed';

// Export queries helper functions
export * from './queries';

// Re-export commonly used items
export {
  restaurants,
  tables,
  staff,
  menuCategories,
  menuItems,
  orders,
  orderItems,
  kitchenLoads,
  schema,
} from './schema';

export {
  getDatabase,
  createDatabase,
  getDatabaseConfig,
  checkDatabaseHealth,
  withTransaction,
  closeDatabaseConnection,
} from './config';

export {
  seedDatabase,
  clearDatabase,
  reseedDatabase,
  seedFunctions,
} from './seed';

// Export types for external use
export type { DatabaseConfig } from './config';
