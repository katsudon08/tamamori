import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { createDatabase } from './client.js';

// drizzle-kit generate 済みの SQL を適用する (db.md §4.2: 配信前に別ステップで migrate() を実行)
async function main() {
  const { db, pool } = createDatabase();
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migration applied');
  } finally {
    await pool.end().catch(() => {}); // cleanup 失敗で本来のエラーを潰さない (#5)
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1; // 失敗を非ゼロ終了で明示 (#5)
});
