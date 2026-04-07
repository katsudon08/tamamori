import { createServerClient } from '@/shared/lib/supabase';

interface UpsertUserData {
    slack_user_id: string;
    slack_team_id: string;
    display_name: string;
    avatar_url: string | null;
}

export async function upsertUser(userData: UpsertUserData) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'slack_user_id' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getUserBySlackId(slackUserId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('slack_user_id', slackUserId)
        .single();
    if (error) throw error;
    return data;
}
