import { createDatabase } from './client.js';

// check.ts / migrate.ts 共通の骨組み。接続 → 処理 → 後始末を集約する (#7)
export async function runDbScript(
  label: string, // 失敗時のログプレフィックス (例 'Migration')
  fn: (db: ReturnType<typeof createDatabase>['db']) => Promise<unknown>,
  successMessage: string, // 成功時のログ (例 'Migration applied')
): Promise<void> {
  const { db, pool } = createDatabase();
  try {
    await fn(db);
    console.log(successMessage);
  } catch (error) {
    console.error(`${label} failed:`, error instanceof Error ? error.message : error);
    process.exitCode = 1; // 失敗を非ゼロ終了で明示 (#5)
  } finally {
    await pool.end().catch(() => {}); // cleanup 失敗で本来のエラーを潰さない (#5)
  }
}
