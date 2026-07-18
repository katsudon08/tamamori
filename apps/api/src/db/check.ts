import { sql } from 'drizzle-orm';

import { createDatabase } from './client.js';

async function main() {
  const { db, pool } = createDatabase();
  try {
    await db.execute(sql`select 1`);
    console.log('Database connection OK');
  } finally {
    await pool.end().catch(() => {}); // cleanup 失敗で本来のエラーを潰さない (#5)
  }
}

main().catch((error) => {
  console.error(
    'Database connection check failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1; // 失敗を非ゼロ終了で明示 (#5)
});
