'use client';

import { useEffect } from 'react';
import { useSWRConfig } from 'swr';

import { createBrowserClient } from '@/shared/lib/supabase';
import type { Database } from '@/shared/lib/supabase';

type BonsaiRow = Database['public']['Tables']['bonsai']['Row'];

const supabase = createBrowserClient();

export function useBonsaiRealtime(userId?: string) {
    const { mutate } = useSWRConfig();

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`bonsai-changes-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bonsai',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newRow = payload.new as BonsaiRow;
                    if (newRow.user_id) {
                        mutate(['bonsai', newRow.user_id]);
                    }
                    mutate('all-bonsai');
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, mutate]);
}
