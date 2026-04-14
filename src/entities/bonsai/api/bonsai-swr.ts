'use client';

import useSWR from 'swr';

import { createBrowserClient } from '@/shared/lib/supabase';

export function useBonsai(userId: string | undefined) {
    return useSWR(userId ? ['bonsai', userId] : null, async ([, id]) => {
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
            .single();
        if (error) throw error;
        return data;
    });
}

export function useAllBonsai() {
    return useSWR('all-bonsai', async () => {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
            .from('bonsai')
            .select(
                `
          *,
          users!inner (display_name, avatar_url)
        `,
            )
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    });
}
