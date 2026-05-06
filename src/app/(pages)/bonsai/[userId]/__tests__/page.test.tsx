/**
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

const mockNotFound = jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
});
jest.mock('next/navigation', () => ({
    notFound: () => mockNotFound(),
}));

const mockGetAuthenticatedSession = jest.fn<() => Promise<Record<string, string>>>();
const mockFetchGrowthRules = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]);
jest.mock('@/features/slack-auth', () => ({
    getAuthenticatedSession: () => mockGetAuthenticatedSession(),
}));
jest.mock('@/features/bonsai-growth', () => ({
    fetchGrowthRules: () => mockFetchGrowthRules(),
}));

type ChainCall = { method: string; args: unknown[] };
const chainCalls: ChainCall[] = [];
let chainResolvedValue: { data: unknown; error: unknown } = { data: null, error: null };

function createChain() {
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'select', 'eq'] as const) {
        chain[method] = (...args: unknown[]) => {
            chainCalls.push({ method, args });
            return chain;
        };
    }
    chain.single = (...args: unknown[]) => {
        chainCalls.push({ method: 'single', args });
        return Promise.resolve(chainResolvedValue);
    };
    return chain;
}

jest.mock('@/shared/lib/supabase', () => ({
    createServerClient: () => createChain(),
}));

jest.mock('../BonsaiPageContent', () => ({
    BonsaiPageContent: () => null,
}));

// --- tests ---------------------------------------------------------------

const TARGET_USER_ID = '12345678-1234-4123-8123-123456789abc';

function buildParams(userId: string = TARGET_USER_ID) {
    return Promise.resolve({ userId });
}

describe('BonsaiPage (SSR)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        chainCalls.length = 0;
        chainResolvedValue = { data: null, error: null };
        mockGetAuthenticatedSession.mockResolvedValue({
            userId: 'session-user',
            slackUserId: 'U1',
            slackTeamId: 'T_CURRENT',
            displayName: 'x',
            avatarUrl: '',
        });
    });

    test('クエリが users!inner JOIN (表示用) + user_id + slack_team_id 直接参照 + single を適用する', async () => {
        chainResolvedValue = { data: { id: 'bonsai-1', user_id: TARGET_USER_ID }, error: null };
        const { default: BonsaiPage } = await import('../page');

        await BonsaiPage({ params: buildParams() });

        expect(chainCalls).toEqual([
            { method: 'from', args: ['bonsai'] },
            { method: 'select', args: ['*, users!inner (display_name, avatar_url)'] },
            { method: 'eq', args: ['user_id', TARGET_USER_ID] },
            // RLS と同じ列を参照する形に統一 (旧: users.slack_team_id)
            { method: 'eq', args: ['slack_team_id', 'T_CURRENT'] },
            { method: 'single', args: [] },
        ]);
    });

    test('他テナントの userId (クエリ結果 null) で notFound() が呼ばれる', async () => {
        chainResolvedValue = { data: null, error: null };
        const { default: BonsaiPage } = await import('../page');

        await expect(BonsaiPage({ params: buildParams() })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockNotFound).toHaveBeenCalledTimes(1);
        // notFound で打ち切られるため growth rules 取得も走らない
        expect(mockFetchGrowthRules).not.toHaveBeenCalled();
    });

    test('同テナントの userId (クエリ結果あり) で SWRConfig fallback に絞り込み済み data が入る', async () => {
        const tenantRow = { id: 'bonsai-1', user_id: TARGET_USER_ID };
        chainResolvedValue = { data: tenantRow, error: null };
        const { default: BonsaiPage } = await import('../page');

        const element = (await BonsaiPage({ params: buildParams() })) as unknown as {
            props: { value: { fallback: Record<string, unknown> } };
        };

        // unstable_serialize(['bonsai', userId]) によるキー。値だけ検証する
        const fallbackValues = Object.values(element.props.value.fallback);
        expect(fallbackValues).toEqual([tenantRow]);
        expect(mockNotFound).not.toHaveBeenCalled();
    });

    test('BonsaiPageContent に userId と slackTeamId が prop として渡る', async () => {
        chainResolvedValue = { data: { id: 'bonsai-1' }, error: null };
        const { default: BonsaiPage } = await import('../page');

        const element = (await BonsaiPage({ params: buildParams() })) as unknown as {
            props: { children: { props: Record<string, unknown> } };
        };

        expect(element.props.children.props.userId).toBe(TARGET_USER_ID);
        expect(element.props.children.props.slackTeamId).toBe('T_CURRENT');
    });
});
