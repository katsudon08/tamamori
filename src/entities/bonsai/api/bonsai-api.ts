import type { BonsaiVisualState, GrowthStage } from '../model/types';

import { createServerClient } from '@/shared/lib/supabase';

interface UpdateBonsaiData {
    total_messages?: number;
    total_reactions?: number;
    total_thanks?: number;
    growth_stage?: GrowthStage;
    visual_state?: BonsaiVisualState;
}

export async function getBonsaiByUserId(userId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('bonsai')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error) throw error;
    return data;
}

export async function createBonsai(userId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('bonsai')
        .insert({ user_id: userId })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateBonsai(id: string, updateData: UpdateBonsaiData) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('bonsai')
        .update(updateData)
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}
