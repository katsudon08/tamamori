import { StatsContent } from './StatsContent';

import { getAuthenticatedSession } from '@/features/slack-auth';

export default async function StatsPage() {
    const session = await getAuthenticatedSession();

    return <StatsContent userId={session.userId} />;
}
