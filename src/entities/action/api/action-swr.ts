'use client';

import useSWR from 'swr';

import { createBrowserClient } from '@/shared/lib/supabase';

const supabase = createBrowserClient();

export function useActionLogs(userId: string | undefined, startDate: string) {
    return useSWR(userId ? ['action-logs', userId, startDate] : null, async ([, id, start]) => {
        const { data, error } = await supabase
            .from('action_log')
            .select('action_type, created_at')
            .eq('user_id', id)
            .gte('created_at', start)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    });
}
