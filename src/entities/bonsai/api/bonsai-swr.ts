'use client';

import useSWR from 'swr';

import { createBrowserClient } from '@/shared/lib/supabase';

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
            .eq('users.slack_team_id', slackTeamId as string)
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
            .eq('users.slack_team_id', slackTeamId as string)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    });
}
