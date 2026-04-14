import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { getEnv } from '../../config';

import type { Database } from './types';

export function createClient() {
    const env = getEnv();
    return createSupabaseClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
