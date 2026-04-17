import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from '@/features/slack-auth';
import { Header } from '@/shared/ui';

export default async function PagesLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession();

    if (!session.userId) {
        redirect('/');
    }

    return (
        <>
            <Header
                rightSlot={
                    <div className="flex items-center gap-3">
                        {session.avatarUrl ? (
                            <Image
                                src={session.avatarUrl}
                                alt={session.displayName}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full"
                                unoptimized
                            />
                        ) : null}
                        <span className="text-sm text-sub">{session.displayName}</span>
                        <a href="/api/auth/logout" className="text-sm text-sub hover:text-main">
                            ログアウト
                        </a>
                    </div>
                }
            >
                <Link href="/garden">花壇</Link>
                <Link href="/bonsai/me">自分の盆栽</Link>
                <Link href="/stats">統計</Link>
            </Header>
            <main className="flex-1 min-h-0">{children}</main>
        </>
    );
}
