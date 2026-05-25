/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

// --- mocks ---------------------------------------------------------------

const mockMutate = jest.fn();
const mockUseAllBonsai =
    jest.fn<
        () => { data: unknown; error: unknown; isLoading: boolean; mutate: typeof mockMutate }
    >();
const mockUseAllBonsaiWithArgs = jest.fn<(slackTeamId: string) => void>();
const mockUseAllBonsaiRealtime = jest.fn<(slackTeamId: string) => void>();

jest.mock('@/entities/bonsai', () => ({
    useAllBonsai: (slackTeamId: string) => {
        mockUseAllBonsaiWithArgs(slackTeamId);
        return mockUseAllBonsai();
    },
}));

jest.mock('@/features/realtime-sync', () => ({
    useAllBonsaiRealtime: (slackTeamId: string) => mockUseAllBonsaiRealtime(slackTeamId),
}));

jest.mock('@/widgets/garden-viewer', () => ({
    GardenViewer: ({ bonsaiList }: { bonsaiList: unknown[] }) => (
        <div data-testid="garden-viewer" data-count={bonsaiList.length} />
    ),
}));

// --- helpers -------------------------------------------------------------

import { GardenContent } from '../GardenContent';

const MOCK_SLACK_TEAM_ID = 'T01XXXX';

const MOCK_DATA = [
    { id: '1', user_id: 'u1', users: { display_name: 'User1', avatar_url: null } },
    { id: '2', user_id: 'u2', users: { display_name: 'User2', avatar_url: null } },
];

beforeEach(() => {
    jest.clearAllMocks();
    mockUseAllBonsai.mockReturnValue({
        data: MOCK_DATA,
        error: null,
        isLoading: false,
        mutate: mockMutate,
    });
});

// --- tests ---------------------------------------------------------------

describe('GardenContent', () => {
    test('useAllBonsai(slackTeamId) フックを呼び出す', () => {
        render(<GardenContent slackTeamId={MOCK_SLACK_TEAM_ID} />);

        expect(mockUseAllBonsai).toHaveBeenCalled();
        expect(mockUseAllBonsaiWithArgs).toHaveBeenCalledWith(MOCK_SLACK_TEAM_ID);
    });

    test('useAllBonsaiRealtime(slackTeamId) フックを呼び出す', () => {
        render(<GardenContent slackTeamId={MOCK_SLACK_TEAM_ID} />);

        expect(mockUseAllBonsaiRealtime).toHaveBeenCalledWith(MOCK_SLACK_TEAM_ID);
    });

    test('SWR データを GardenViewer に渡す', () => {
        render(<GardenContent slackTeamId={MOCK_SLACK_TEAM_ID} />);

        const viewer = screen.getByTestId('garden-viewer');
        expect(viewer).toHaveAttribute('data-count', '2');
    });

    test('data が undefined の場合は空配列を渡す', () => {
        mockUseAllBonsai.mockReturnValue({
            data: undefined,
            error: null,
            isLoading: false,
            mutate: mockMutate,
        });

        render(<GardenContent slackTeamId={MOCK_SLACK_TEAM_ID} />);

        const viewer = screen.getByTestId('garden-viewer');
        expect(viewer).toHaveAttribute('data-count', '0');
    });

    test('isLoading 中はローディング表示される', () => {
        mockUseAllBonsai.mockReturnValue({
            data: undefined,
            error: null,
            isLoading: true,
            mutate: mockMutate,
        });

        render(<GardenContent slackTeamId={MOCK_SLACK_TEAM_ID} />);

        expect(screen.getByTestId('loading')).toBeInTheDocument();
        expect(screen.queryByTestId('garden-viewer')).not.toBeInTheDocument();
    });

    test('データなし + エラー時にエラーメッセージが表示される', () => {
        mockUseAllBonsai.mockReturnValue({
            data: undefined,
            error: new Error('fetch failed'),
            isLoading: false,
            mutate: mockMutate,
        });

        render(<GardenContent slackTeamId={MOCK_SLACK_TEAM_ID} />);

        expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
        expect(screen.queryByTestId('garden-viewer')).not.toBeInTheDocument();
    });

    test('fallback データあり + 再検証エラー時は GardenViewer を表示する', () => {
        mockUseAllBonsai.mockReturnValue({
            data: MOCK_DATA,
            error: new Error('revalidation failed'),
            isLoading: false,
            mutate: mockMutate,
        });

        render(<GardenContent slackTeamId={MOCK_SLACK_TEAM_ID} />);

        expect(screen.getByTestId('garden-viewer')).toBeInTheDocument();
        expect(screen.queryByText('データの取得に失敗しました')).not.toBeInTheDocument();
    });
});
