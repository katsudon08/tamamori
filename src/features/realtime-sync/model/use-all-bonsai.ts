'use client';

import { useEffect } from 'react';
import { useSWRConfig } from 'swr';

import { createBrowserClient } from '@/shared/lib/supabase';
import type { Database } from '@/shared/lib/supabase';

type BonsaiRow = Database['public']['Tables']['bonsai']['Row'];

const supabase = createBrowserClient();

export function useAllBonsaiRealtime() {
    const { mutate } = useSWRConfig();

    useEffect(() => {
        const channel = supabase
            .channel('bonsai-changes-all')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bonsai',
                },
                (payload) => {
                    mutate('all-bonsai');
                    const newRow = payload.new as BonsaiRow;
                    if (newRow.user_id) {
                        mutate(['bonsai', newRow.user_id]);
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [mutate]);
}
