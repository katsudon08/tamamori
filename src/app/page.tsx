import { redirect } from 'next/navigation';
import { LandingContent } from '@/widgets/landing';
import { getServerSession, isAuthenticated } from '@/features/slack-auth';

type PageProps = {
    searchParams: Promise<{ error?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
    const session = await getServerSession();

    if (isAuthenticated(session)) {
        redirect('/garden');
    }

    const { error } = await searchParams;

    return <LandingContent error={error} />;
}
