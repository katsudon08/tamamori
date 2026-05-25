import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getEnv } from '@/shared/config';
import type { Database } from '@/shared/lib/supabase/types';

export interface TenantFixture {
    userId: string;
    slackUserId: string;
    slackTeamId: string;
    displayName: string;
}

export const TENANT_A: TenantFixture = {
    userId: 'a0000000-0000-4000-a000-000000000001',
    slackUserId: 'U_E2E_TEST',
    slackTeamId: 'T_E2E_TEST',
    displayName: 'E2E Test User',
};

export const TENANT_B: TenantFixture = {
    userId: 'b0000000-0000-4000-b000-000000000002',
    slackUserId: 'U_E2E_TEST_B',
    slackTeamId: 'T_E2E_TEST_B',
    displayName: 'E2E Test User B',
};

/** 既存 E2E で参照されている互換用エイリアス */
export const TEST_USER_ID = TENANT_A.userId;

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
    const env = getEnv();
    return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });
}

/** 指定ユーザーの盆栽を seed.sql と同じ初期状態に戻す */
export async function resetBonsaiForUser(userId: string): Promise<void> {
    const client = createTestSupabaseClient();

    const { error: delError } = await client.from('action_log').delete().eq('user_id', userId);
    if (delError) {
        throw new Error(`action_log delete failed for ${userId}: ${delError.message}`);
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
        .eq('user_id', userId);
    if (updError) {
        throw new Error(`bonsai update failed for ${userId}: ${updError.message}`);
    }
}

/** TENANT_A の盆栽だけ初期状態に戻す (既存 E2E 互換) */
export async function resetTestBonsai(): Promise<void> {
    return resetBonsaiForUser(TENANT_A.userId);
}
