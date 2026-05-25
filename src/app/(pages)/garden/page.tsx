import { SWRConfig } from 'swr';

import { GardenContent } from './GardenContent';

import { getAuthenticatedSession } from '@/features/slack-auth';
import { createServerClient } from '@/shared/lib/supabase';

export default async function GardenPage() {
    const { slackTeamId } = await getAuthenticatedSession();
    const supabase = createServerClient();
    // 表示用 JOIN は維持。テナント filter は RLS と同じ列 (bonsai.slack_team_id)
    // を直接参照する形に統一。
    const { data } = await supabase
        .from('bonsai')
        .select('*, users!inner (display_name, avatar_url)')
        .eq('slack_team_id', slackTeamId)
        .order('created_at', { ascending: true });

    return (
        <SWRConfig value={{ fallback: { 'all-bonsai': data } }}>
            <GardenContent slackTeamId={slackTeamId} />
        </SWRConfig>
    );
}
