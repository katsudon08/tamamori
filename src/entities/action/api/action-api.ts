import { createServerClient } from '@/shared/lib/supabase';

import type { Json } from '@/shared/lib/supabase/types';

export interface InsertActionData {
    user_id: string;
    /**
     * action_log.slack_team_id (denormalize 列)。RLS と複合 FK の双方が
     * この値で評価されるため、呼び出し側は user 取得結果由来の値を必ず渡すこと。
     * リクエスト由来の値を直接渡してはならない。
     */
    slack_team_id: string;
    action_type: string;
    slack_event_id: string;
    slack_channel: string | null;
    metadata: { [key: string]: Json | undefined };
}

export async function insertAction(data: InsertActionData) {
    const supabase = createServerClient();
    const { data: result, error } = await supabase
        .from('action_log')
        .insert(data)
        .select()
        .single();
    if (error) throw error;
    return result;
}

/**
 * Slack event の冪等性を tenant-aware に確認する。
 *
 * createServerClient は service_role 経路で RLS をバイパスするため、
 * slack_team_id filter をアプリ層でも必ず付ける。
 */
export async function checkEventExists(
    slackEventId: string,
    slackTeamId: string,
): Promise<boolean> {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('action_log')
        .select('id')
        .eq('slack_event_id', slackEventId)
        .eq('slack_team_id', slackTeamId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return false;
        throw error;
    }

    return !!data;
}
