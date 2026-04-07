import { createServerClient } from '@/shared/lib/supabase';

import type { Json } from '@/shared/lib/supabase/types';

interface InsertActionData {
    user_id: string;
    action_type: string;
    slack_event_id: string;
    slack_channel: string | null;
    metadata: { [key: string]: Json | undefined };
}

export async function insertAction(data: InsertActionData) {
    const supabase = createServerClient();
    const { data: result, error } = await supabase
        .from('action_log')
        .insert(data)
        .select()
        .single();
    if (error) throw error;
    return result;
}

export async function checkEventExists(slackEventId: string): Promise<boolean> {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('action_log')
        .select('id')
        .eq('slack_event_id', slackEventId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return false;
        throw error;
    }

    return !!data;
}
