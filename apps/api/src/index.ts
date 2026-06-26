import { serve } from '@hono/node-server';
import { Hono } from 'hono';

// apps/api の最小構成。Slack Bolt / 認証 / DB(Drizzle) / WebSocket 配信は
// #94 以降で実装する。ここでは死活確認用の /health のみを提供する。
const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
    // eslint-disable-next-line no-console
    console.log(`@tamamori/api listening on http://localhost:${info.port}`);
});

export default app;
