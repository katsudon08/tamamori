import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { env } from '../../config';

import type { Database } from './types';

export function createClient() {
    return createSupabaseClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
