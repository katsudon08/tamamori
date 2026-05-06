'use client';

import useSWR from 'swr';

import { createBrowserClient } from '@/shared/lib/supabase';

/**
 * 自分の action_log を期間指定で取得する SWR フック。
 *
 * RLS は authenticated 経路で効くが、防御の対称性として slack_team_id filter
 * もアプリ層で持つ (#75 多層防御方針)。SWR key にも slack_team_id を含める
 * ことで、テナント切替時に古いキャッシュを再利用しないようにする。
 */
export function useActionLogs(
    userId: string | undefined,
    slackTeamId: string | undefined,
    startDate: string,
) {
    const key =
        userId && slackTeamId ? (['action-logs', userId, slackTeamId, startDate] as const) : null;
    return useSWR(key, async ([, id, teamId, start]) => {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
            .from('action_log')
            .select('action_type, created_at')
            .eq('user_id', id)
            .eq('slack_team_id', teamId)
            .gte('created_at', start)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    });
}
