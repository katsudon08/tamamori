import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/lib/supabase/types';

export const TEST_USER_ID = 'a0000000-0000-4000-a000-000000000001';

const DEFAULT_VISUAL_STATE = {
    trunkHeight: 0.3,
    trunkThickness: 0.05,
    branches: [],
    leaves: 0,
    leafColor: '#228B22',
    flowers: 0,
    flowerColor: '#FFB7C5',
    potColor: '#8B4513',
};

export function createTestSupabaseClient(): SupabaseClient<Database> {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です');
    }
    return createClient<Database>(url, key, {
        auth: { persistSession: false },
    });
}

/** テストユーザーの盆栽を seed.sql と同じ状態に戻す */
export async function resetTestBonsai(): Promise<void> {
    const client = createTestSupabaseClient();

    const { error: delError } = await client
        .from('action_log')
        .delete()
        .eq('user_id', TEST_USER_ID);
    if (delError) {
        throw new Error(`action_log delete failed: ${delError.message}`);
    }

    const { error: updError } = await client
        .from('bonsai')
        .update({
            total_messages: 0,
            total_reactions: 0,
            total_thanks: 0,
            growth_stage: 'seed',
            visual_state: DEFAULT_VISUAL_STATE,
        })
        .eq('user_id', TEST_USER_ID);
    if (updError) {
        throw new Error(`bonsai update failed: ${updError.message}`);
    }
}
