// Export schema
export * from './schema';

// Export configuration
export * from './config';

// Export seed functions
export * from './seed';

// Export queries helper functions
export * from './queries';

// Export validators
export * from './validators';

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
  closeDatabaseConnection,
} from './config';

export {
  seedDatabase,
  clearDatabase,
  reseedDatabase,
  seedFunctions,
} from './seed';

export {
  validators,
  validateSchema,
} from './validators';

// Export types for external use
export type { DatabaseConfig } from './config';
