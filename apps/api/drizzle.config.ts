import { defineConfig } from 'drizzle-kit';

// スキーマから SQL を生成する (out にコミット)。適用は src/adapters/db/migrate.ts で行う。
// 本番で push は使わない方針 (db.md §4.2)。
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/adapters/db/schema.ts',
  out: './drizzle',
});
