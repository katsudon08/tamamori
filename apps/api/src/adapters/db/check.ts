import { sql } from 'drizzle-orm';

import { runDbScript } from './run-script.js';

await runDbScript(
  'Database connection check',
  (db) => db.execute(sql`select 1`),
  'Database connection OK',
);
