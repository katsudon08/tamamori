import type { GrowthStage } from '@/entities/bonsai';
import { createServerClient } from '@/shared/lib/supabase';

export interface GrowthRule {
    id: string;
    stage: GrowthStage;
    min_messages: number;
    min_reactions: number;
    min_thanks: number;
    sort_order: number;
}

export async function fetchGrowthRules(): Promise<GrowthRule[]> {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('growth_rules')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as GrowthRule[];
}
