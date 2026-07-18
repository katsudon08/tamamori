import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { loadDatabaseUrl } from '../config/env.js';

export function createDatabase(databaseUrl = loadDatabaseUrl()) {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle({ client: pool });

  return { db, pool };
}
