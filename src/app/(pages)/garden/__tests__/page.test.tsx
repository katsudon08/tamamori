/**
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- mocks ---------------------------------------------------------------

const mockGetAuthenticatedSession = jest.fn<() => Promise<Record<string, string>>>();
jest.mock('@/features/slack-auth', () => ({
    getAuthenticatedSession: () => mockGetAuthenticatedSession(),
}));

type ChainCall = { method: string; args: unknown[] };
const chainCalls: ChainCall[] = [];
let chainResolvedValue: { data: unknown; error: unknown } = { data: [], error: null };

function createChain() {
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'select', 'eq'] as const) {
        chain[method] = (...args: unknown[]) => {
            chainCalls.push({ method, args });
            return chain;
        };
    }
    chain.order = (...args: unknown[]) => {
        chainCalls.push({ method: 'order', args });
        return Promise.resolve(chainResolvedValue);
    };
    return chain;
}

jest.mock('@/shared/lib/supabase', () => ({
    createServerClient: () => createChain(),
}));

jest.mock('../GardenContent', () => ({
    GardenContent: () => null,
}));

// --- tests ---------------------------------------------------------------

describe('GardenPage (SSR)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        chainCalls.length = 0;
        chainResolvedValue = { data: [], error: null };
        mockGetAuthenticatedSession.mockResolvedValue({
            userId: 'uuid-1',
            slackUserId: 'U1',
            slackTeamId: 'T_CURRENT',
            displayName: 'x',
            avatarUrl: '',
        });
    });

    test('クエリが bonsai に users!inner JOIN (表示用) + slack_team_id 直接参照 filter を適用する', async () => {
        const { default: GardenPage } = await import('../page');

        await GardenPage();

        expect(chainCalls).toEqual([
            { method: 'from', args: ['bonsai'] },
            { method: 'select', args: ['*, users!inner (display_name, avatar_url)'] },
            // RLS と同じ列を参照する形に統一 (旧: users.slack_team_id)
            { method: 'eq', args: ['slack_team_id', 'T_CURRENT'] },
            { method: 'order', args: ['created_at', { ascending: true }] },
        ]);
    });

    test('SWRConfig fallback の "all-bonsai" キーに tenant filter 済み data が入る', async () => {
        const tenantData = [{ id: 'b1', user_id: 'u1' }];
        chainResolvedValue = { data: tenantData, error: null };
        const { default: GardenPage } = await import('../page');

        const element = (await GardenPage()) as unknown as {
            props: { value: { fallback: Record<string, unknown> } };
        };

        expect(element.props.value.fallback['all-bonsai']).toBe(tenantData);
    });

    test('GardenContent に現在セッションの slackTeamId が prop として渡る', async () => {
        const { default: GardenPage } = await import('../page');

        const element = (await GardenPage()) as unknown as {
            props: { children: { props: Record<string, unknown> } };
        };

        expect(element.props.children.props.slackTeamId).toBe('T_CURRENT');
    });
});
