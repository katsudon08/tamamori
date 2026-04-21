import { notFound } from 'next/navigation';
import { unstable_serialize, SWRConfig } from 'swr';

import { BonsaiPageContent } from './BonsaiPageContent';

import { fetchGrowthRules } from '@/features/bonsai-growth';
import { getAuthenticatedSession } from '@/features/slack-auth';
import { createServerClient } from '@/shared/lib/supabase';

export default async function BonsaiPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params;
    const { slackTeamId } = await getAuthenticatedSession();
    const supabase = createServerClient();

    const { data } = await supabase
        .from('bonsai')
        .select('*, users!inner (display_name, avatar_url)')
        .eq('user_id', userId)
        .eq('users.slack_team_id', slackTeamId)
        .single();

    if (!data) {
        notFound();
    }

    const growthRules = await fetchGrowthRules();

    return (
        <SWRConfig value={{ fallback: { [unstable_serialize(['bonsai', userId])]: data } }}>
            <BonsaiPageContent
                userId={userId}
                slackTeamId={slackTeamId}
                growthRules={growthRules}
            />
        </SWRConfig>
    );
}
