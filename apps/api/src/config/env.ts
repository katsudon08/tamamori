import { z } from 'zod';

const portSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed; // 空/空白は未設定扱い (#3)
  },
  z
    .string()
    .regex(/^\d+$/, 'PORT must be a positive integer') // hex/指数/空白混じりを拒否 (#6)
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .default(8787),
);

const serverEnvSchema = z.object({ PORT: portSchema });
const databaseUrlSchema = z.object({ DATABASE_URL: z.url() });

function parseOrThrow<T>(schema: z.ZodType<T>, source: NodeJS.ProcessEnv): T {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): { port: number } {
  const { PORT } = parseOrThrow(serverEnvSchema, source);
  return { port: PORT };
}

export function loadDatabaseUrl(source: NodeJS.ProcessEnv = process.env): string {
  const { DATABASE_URL } = parseOrThrow(databaseUrlSchema, source);
  return DATABASE_URL;
}
