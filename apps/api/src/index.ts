import { serve } from '@hono/node-server';

import { app } from './app.js';
import { loadServerEnv } from './config/env.js';

const { port } = loadServerEnv();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`@tamamori/api listening on http://localhost:${info.port}`);
});
