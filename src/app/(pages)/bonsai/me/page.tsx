import { redirect } from 'next/navigation';

import { getServerSession } from '@/features/slack-auth';

export default async function BonsaiMePage() {
    const session = await getServerSession();
    redirect(`/bonsai/${session.userId}`);
}
