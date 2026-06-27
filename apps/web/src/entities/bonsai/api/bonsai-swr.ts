import useSWR from 'swr';

import { createBrowserClient } from '@/shared/lib/supabase';

// `users!inner` JOIN は display_name / avatar_url を引くために残す。
// テナント filter は RLS と同じ列 (bonsai.slack_team_id) を直接参照する形に統一。
// 旧来の `.eq('users.slack_team_id', ...)` は postgres_changes で機能しないため使わない。

export function useBonsai(userId: string | undefined, slackTeamId: string | undefined) {
    return useSWR(userId && slackTeamId ? ['bonsai', userId] : null, async ([, id]) => {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
            .from('bonsai')
            .select(
                `
          *,
          users!inner (display_name, avatar_url)
        `,
            )
            .eq('user_id', id)
            .eq('slack_team_id', slackTeamId as string)
            .single();
        if (error) throw error;
        return data;
    });
}

export function useAllBonsai(slackTeamId: string | undefined) {
    return useSWR(slackTeamId ? 'all-bonsai' : null, async () => {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
            .from('bonsai')
            .select(
                `
          *,
          users!inner (display_name, avatar_url)
        `,
            )
            .eq('slack_team_id', slackTeamId as string)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    });
}
