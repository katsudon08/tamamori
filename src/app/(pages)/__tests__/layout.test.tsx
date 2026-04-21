/**
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

const mockGetAuthenticatedSession = jest.fn<() => Promise<Record<string, string>>>();
jest.mock('@/features/slack-auth', () => ({
    getAuthenticatedSession: () => mockGetAuthenticatedSession(),
}));

jest.mock('@/shared/ui', () => ({
    Header: ({ children }: { children: React.ReactNode }) => children,
    NavLink: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('next/image', () => ({
    __esModule: true,
    default: () => null,
}));

// --- tests ---------------------------------------------------------------

describe('PagesLayout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('認証済みセッション取得時は正常に描画される', async () => {
        mockGetAuthenticatedSession.mockResolvedValue({
            userId: 'uuid-1',
            slackUserId: 'U1',
            slackTeamId: 'T1',
            displayName: 'x',
            avatarUrl: '',
        });
        const { default: PagesLayout } = await import('../layout');

        await expect(PagesLayout({ children: null })).resolves.toBeDefined();
    });

    test('getAuthenticatedSession 内で redirect されれば例外が伝播する', async () => {
        // getAuthenticatedSession が内部で redirect('/') 相当を投げるケース
        mockGetAuthenticatedSession.mockRejectedValue(new Error('NEXT_REDIRECT:/'));
        const { default: PagesLayout } = await import('../layout');

        await expect(PagesLayout({ children: null })).rejects.toThrow('NEXT_REDIRECT:/');
    });
});
