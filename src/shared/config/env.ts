import type { Env } from './env-schema';
import { parseEnv } from './env-schema';

export type { Env } from './env-schema';

let _env: Env | undefined;

export function getEnv(): Env {
    return (_env ??= parseEnv());
}
