import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getServerSession } from '@/features/slack-auth';
import { Header, NavLink } from '@/shared/ui';

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
                <NavLink href="/garden">花壇</NavLink>
                <NavLink href="/bonsai/me" matchPaths={[`/bonsai/${session.userId}`]}>
                    自分の盆栽
                </NavLink>
                <NavLink href="/stats">統計</NavLink>
            </Header>
            <main className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">{children}</main>
        </>
    );
}
