import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import type { ReactElement } from 'react';
import type { ReadonlySession } from '@/features/slack-auth';

const mockRedirect = jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
});

jest.mock('next/navigation', () => ({
    redirect: (path: string) => mockRedirect(path),
}));

const mockGetServerSession = jest.fn<() => Promise<ReadonlySession>>();

jest.mock('@/features/slack-auth', () => ({
    getServerSession: () => mockGetServerSession(),
    isAuthenticated: (session: ReadonlySession) =>
        session.userId !== '' && session.slackTeamId !== '' && session.slackUserId !== '',
}));

jest.mock('@/widgets/landing', () => ({
    LandingContent: ({ error }: { error?: string }) => ({
        type: 'LandingContent',
        props: { error },
    }),
}));

const unauthenticatedSession: ReadonlySession = {
    userId: '',
    slackUserId: '',
    slackTeamId: '',
    displayName: '',
    avatarUrl: '',
};

describe('Home page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetServerSession.mockResolvedValue(unauthenticatedSession);
    });

    test('認証済みセッションなら /garden へ redirect する', async () => {
        mockGetServerSession.mockResolvedValueOnce({
            userId: 'user-1',
            slackUserId: 'U01',
            slackTeamId: 'T01',
            displayName: 'User',
            avatarUrl: '',
        });
        const { default: Home } = await import('../page');

        await expect(Home({ searchParams: Promise.resolve({}) })).rejects.toThrow(
            'REDIRECT:/garden',
        );
        expect(mockRedirect).toHaveBeenCalledWith('/garden');
    });

    test('部分的に壊れたセッションは認証済み扱いせず landing を表示する', async () => {
        mockGetServerSession.mockResolvedValueOnce({
            userId: 'user-1',
            slackUserId: '',
            slackTeamId: '',
            displayName: '',
            avatarUrl: '',
        });
        const { default: Home } = await import('../page');

        const result = await Home({ searchParams: Promise.resolve({ error: 'session_expired' }) });

        expect(mockRedirect).not.toHaveBeenCalled();
        expect((result as ReactElement<{ error?: string }>).props.error).toBe('session_expired');
    });
});
