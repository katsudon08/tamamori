import { redirect } from 'next/navigation';
import { getServerSession } from '@/features/slack-auth';
import { Header } from '@/shared/ui';

export default async function PagesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession();

    if (!session.userId) {
        redirect('/');
    }

    return (
        <>
            <Header />
            <main className="flex-1">{children}</main>
        </>
    );
}
