/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

// --- mocks ---------------------------------------------------------------

const mockMutate = jest.fn();
const mockUseBonsai =
    jest.fn<
        () => { data: unknown; error: unknown; isLoading: boolean; mutate: typeof mockMutate }
    >();
const mockUseBonsaiWithArgs = jest.fn<(userId: string, slackTeamId: string) => void>();
const mockUseBonsaiRealtime = jest.fn();

jest.mock('@/entities/bonsai', () => ({
    ...(jest.requireActual('@/entities/bonsai') as Record<string, unknown>),
    useBonsai: (userId: string, slackTeamId: string) => {
        mockUseBonsaiWithArgs(userId, slackTeamId);
        return mockUseBonsai();
    },
}));

jest.mock('@/features/realtime-sync', () => ({
    useBonsaiRealtime: (...args: unknown[]) => {
        mockUseBonsaiRealtime(...args);
    },
}));

let capturedBonsaiViewerProps: Record<string, unknown> = {};

jest.mock('@/widgets/bonsai-viewer', () => ({
    BonsaiViewer: (props: Record<string, unknown>) => {
        capturedBonsaiViewerProps = props;
        return <div data-testid="bonsai-viewer" />;
    },
}));

// --- helpers -------------------------------------------------------------

import { BonsaiPageContent } from '../BonsaiPageContent';
import type { GrowthRule } from '@/features/bonsai-growth';

const MOCK_USER_ID = '12345678-1234-4123-8123-123456789abc';
const MOCK_SLACK_TEAM_ID = 'T01XXXX';

const MOCK_VISUAL_STATE = {
    trunkHeight: 1.0,
    trunkThickness: 0.5,
    branches: [],
    leaves: 10,
    leafColor: '#22c55e',
    flowers: 0,
    flowerColor: '#ec4899',
    potColor: '#8b4513',
};

const MOCK_DATA = {
    id: 'abcdef01-2345-4678-9abc-def012345678',
    user_id: MOCK_USER_ID,
    total_messages: 25,
    total_reactions: 10,
    total_thanks: 2,
    growth_stage: 'branching',
    visual_state: MOCK_VISUAL_STATE,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    users: { display_name: 'Test User', avatar_url: 'https://example.com/avatar.png' },
};

const MOCK_GROWTH_RULES: GrowthRule[] = [
    {
        id: '1',
        stage: 'branching',
        min_messages: 20,
        min_reactions: 10,
        min_thanks: 2,
        sort_order: 4,
    },
    { id: '2', stage: 'leafy', min_messages: 60, min_reactions: 30, min_thanks: 10, sort_order: 5 },
];

const MOCK_GROWTH_RULES_AT_MAX: GrowthRule[] = [
    {
        id: '1',
        stage: 'branching',
        min_messages: 20,
        min_reactions: 10,
        min_thanks: 2,
        sort_order: 4,
    },
];

const EXPECTED_THRESHOLDS = { min_messages: 60, min_reactions: 30, min_thanks: 10 };

beforeEach(() => {
    jest.clearAllMocks();
    capturedBonsaiViewerProps = {};
    mockUseBonsai.mockReturnValue({
        data: MOCK_DATA,
        error: null,
        isLoading: false,
        mutate: mockMutate,
    });
});

// --- tests ---------------------------------------------------------------

describe('BonsaiPageContent', () => {
    test('useBonsai(userId, slackTeamId) フックを呼び出す', () => {
        render(
            <BonsaiPageContent
                userId={MOCK_USER_ID}
                slackTeamId={MOCK_SLACK_TEAM_ID}
                growthRules={MOCK_GROWTH_RULES}
            />,
        );

        expect(mockUseBonsaiWithArgs).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_SLACK_TEAM_ID);
    });

    test('useBonsaiRealtime(userId, slackTeamId) フックを呼び出す', () => {
        render(
            <BonsaiPageContent
                userId={MOCK_USER_ID}
                slackTeamId={MOCK_SLACK_TEAM_ID}
                growthRules={MOCK_GROWTH_RULES}
            />,
        );

        expect(mockUseBonsaiRealtime).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_SLACK_TEAM_ID);
    });

    test('SWR データを BonsaiViewer に渡す', () => {
        render(
            <BonsaiPageContent
                userId={MOCK_USER_ID}
                slackTeamId={MOCK_SLACK_TEAM_ID}
                growthRules={MOCK_GROWTH_RULES}
            />,
        );

        expect(screen.getByTestId('bonsai-viewer')).toBeInTheDocument();
        expect(capturedBonsaiViewerProps.bonsai).toEqual({
            id: MOCK_DATA.id,
            user_id: MOCK_DATA.user_id,
            total_messages: MOCK_DATA.total_messages,
            total_reactions: MOCK_DATA.total_reactions,
            total_thanks: MOCK_DATA.total_thanks,
            growth_stage: MOCK_DATA.growth_stage,
            visual_state: MOCK_VISUAL_STATE,
            created_at: MOCK_DATA.created_at,
            updated_at: MOCK_DATA.updated_at,
        });
        expect(capturedBonsaiViewerProps.user).toEqual({
            display_name: 'Test User',
            avatar_url: 'https://example.com/avatar.png',
        });
    });

    test('現在ステージの次の閾値を算出して BonsaiViewer に渡す', () => {
        render(
            <BonsaiPageContent
                userId={MOCK_USER_ID}
                slackTeamId={MOCK_SLACK_TEAM_ID}
                growthRules={MOCK_GROWTH_RULES}
            />,
        );

        expect(capturedBonsaiViewerProps.nextStageThresholds).toEqual(EXPECTED_THRESHOLDS);
    });

    test('最大ステージ (次がない) のときは null を BonsaiViewer に渡す', () => {
        render(
            <BonsaiPageContent
                userId={MOCK_USER_ID}
                slackTeamId={MOCK_SLACK_TEAM_ID}
                growthRules={MOCK_GROWTH_RULES_AT_MAX}
            />,
        );

        expect(capturedBonsaiViewerProps.nextStageThresholds).toBeNull();
    });

    test('isLoading 中はローディング表示される', () => {
        mockUseBonsai.mockReturnValue({
            data: undefined,
            error: null,
            isLoading: true,
            mutate: mockMutate,
        });

        render(
            <BonsaiPageContent
                userId={MOCK_USER_ID}
                slackTeamId={MOCK_SLACK_TEAM_ID}
                growthRules={MOCK_GROWTH_RULES}
            />,
        );

        expect(screen.getByTestId('loading')).toBeInTheDocument();
        expect(screen.queryByTestId('bonsai-viewer')).not.toBeInTheDocument();
    });

    test('データなし + エラー時にエラーメッセージが表示される', () => {
        mockUseBonsai.mockReturnValue({
            data: undefined,
            error: new Error('fetch failed'),
            isLoading: false,
            mutate: mockMutate,
        });

        render(
            <BonsaiPageContent
                userId={MOCK_USER_ID}
                slackTeamId={MOCK_SLACK_TEAM_ID}
                growthRules={MOCK_GROWTH_RULES}
            />,
        );

        expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
        expect(screen.queryByTestId('bonsai-viewer')).not.toBeInTheDocument();
    });

    test('fallback データあり + 再検証エラー時は BonsaiViewer を表示する', () => {
        mockUseBonsai.mockReturnValue({
            data: MOCK_DATA,
            error: new Error('revalidation failed'),
            isLoading: false,
            mutate: mockMutate,
        });

        render(
            <BonsaiPageContent
                userId={MOCK_USER_ID}
                slackTeamId={MOCK_SLACK_TEAM_ID}
                growthRules={MOCK_GROWTH_RULES}
            />,
        );

        expect(screen.getByTestId('bonsai-viewer')).toBeInTheDocument();
        expect(screen.queryByText('データの取得に失敗しました')).not.toBeInTheDocument();
    });
});
