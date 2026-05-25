import { redirect } from 'next/navigation';

import { getAuthenticatedSession } from '@/features/slack-auth';

export default async function BonsaiMePage() {
    const session = await getAuthenticatedSession();
    redirect(`/bonsai/${session.userId}`);
}
