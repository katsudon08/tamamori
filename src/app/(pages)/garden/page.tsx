import { SWRConfig } from 'swr';

import { GardenContent } from './GardenContent';

import { getAuthenticatedSession } from '@/features/slack-auth';
import { createServerClient } from '@/shared/lib/supabase';

export default async function GardenPage() {
    const { slackTeamId } = await getAuthenticatedSession();
    const supabase = createServerClient();
    const { data } = await supabase
        .from('bonsai')
        .select('*, users!inner (display_name, avatar_url)')
        .eq('users.slack_team_id', slackTeamId)
        .order('created_at', { ascending: true });

    return (
        <SWRConfig value={{ fallback: { 'all-bonsai': data } }}>
            <GardenContent slackTeamId={slackTeamId} />
        </SWRConfig>
    );
}
