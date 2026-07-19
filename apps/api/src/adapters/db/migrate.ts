import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { runDbScript } from './run-script.js';

// drizzle-kit generate 済みの SQL を適用する (db.md §4.2: 配信前に別ステップで migrate() を実行)
// migrationsFolder は cwd 相対のまま据え置き (#1 として #140 で対応)
await runDbScript(
  'Migration',
  (db) => migrate(db, { migrationsFolder: './drizzle' }),
  'Migration applied',
);
