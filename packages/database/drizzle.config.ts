import { defineConfig } from "drizzle-kit";
import { getDatabaseConfig, createDatabaseUrl } from './src/config';

const config = getDatabaseConfig();
const dbUrl = createDatabaseUrl(config);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
  strict: true
});
