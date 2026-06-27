import useSWR from 'swr';

import type { GrowthStage } from '@/entities/bonsai';
import { createBrowserClient } from '@/shared/lib/supabase';

export interface GrowthRule {
    id: string;
    stage: GrowthStage;
    min_messages: number;
    min_reactions: number;
    min_thanks: number;
    sort_order: number;
}

/**
 * 成長ルール(growth_rules)を取得する SWR フック。
 *
 * - growth_rules は不変マスタのため、再検証を抑制して初回1回だけ取得する。
 * - authenticated JWT による RLS (`authenticated_select_growth_rules USING (true)`,
 *   migration 008) で参照できるため、apps/web から直接 REST 取得する。
 *   #94 で apps/api 経由の取得へ差し替える。
 */
export function useGrowthRules() {
    return useSWR(
        'growth-rules',
        async () => {
            const supabase = createBrowserClient();
            const { data, error } = await supabase
                .from('growth_rules')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data as GrowthRule[];
        },
        {
            revalidateIfStale: false,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    );
}
