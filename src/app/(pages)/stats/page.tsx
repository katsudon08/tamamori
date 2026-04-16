import { StatsContent } from './StatsContent';

import { getServerSession } from '@/features/slack-auth';

export default async function StatsPage() {
    const session = await getServerSession();

    return <StatsContent userId={session.userId} />;
}
