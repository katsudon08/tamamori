/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// --- mocks ---------------------------------------------------------------

const mockUseActionLogs = jest.fn<() => { data: unknown; error: unknown; isLoading: boolean }>();
const mockUseActionLogsWithArgs = jest.fn<(userId: string, startDate: string) => void>();

jest.mock('@/entities/action', () => ({
    useActionLogs: (userId: string, startDate: string) => {
        mockUseActionLogsWithArgs(userId, startDate);
        return mockUseActionLogs();
    },
}));

let capturedTimelineProps: Record<string, unknown> = {};
let capturedBreakdownProps: Record<string, unknown> = {};

jest.mock('@/widgets/stats-panel', () => ({
    GrowthTimeline: (props: Record<string, unknown>) => {
        capturedTimelineProps = props;
        return <div data-testid="growth-timeline" />;
    },
    ActionBreakdown: (props: Record<string, unknown>) => {
        capturedBreakdownProps = props;
        return <div data-testid="action-breakdown" />;
    },
}));

// --- helpers -------------------------------------------------------------

import { StatsContent } from '../StatsContent';

const MOCK_USER_ID = '12345678-1234-4123-8123-123456789abc';

const MOCK_DATA = [
    { action_type: 'message', created_at: '2026-04-10T10:00:00Z' },
    { action_type: 'reaction', created_at: '2026-04-11T12:00:00Z' },
    { action_type: 'thanks', created_at: '2026-04-12T09:00:00Z' },
];

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}

beforeEach(() => {
    jest.clearAllMocks();
    capturedTimelineProps = {};
    capturedBreakdownProps = {};
    mockUseActionLogs.mockReturnValue({ data: MOCK_DATA, error: null, isLoading: false });
});

// --- tests ---------------------------------------------------------------

describe('StatsContent', () => {
    test('useActionLogs(userId, startDate) フックを呼び出す', () => {
        render(<StatsContent userId={MOCK_USER_ID} />);

        expect(mockUseActionLogsWithArgs).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(String));
    });

    test('デフォルトは直近7日で取得する', () => {
        render(<StatsContent userId={MOCK_USER_ID} />);

        const expected = daysAgo(7);
        expect(mockUseActionLogsWithArgs).toHaveBeenCalledWith(MOCK_USER_ID, expected);
    });

    test('SWR データを GrowthTimeline に渡す', () => {
        render(<StatsContent userId={MOCK_USER_ID} />);

        expect(screen.getByTestId('growth-timeline')).toBeInTheDocument();
        expect(capturedTimelineProps.actions).toEqual(MOCK_DATA);
    });

    test('SWR データを ActionBreakdown に渡す', () => {
        render(<StatsContent userId={MOCK_USER_ID} />);

        expect(screen.getByTestId('action-breakdown')).toBeInTheDocument();
        expect(capturedBreakdownProps.actions).toEqual(MOCK_DATA);
    });

    test('isLoading 中はローディング表示される', () => {
        mockUseActionLogs.mockReturnValue({ data: undefined, error: null, isLoading: true });

        render(<StatsContent userId={MOCK_USER_ID} />);

        expect(screen.getByTestId('loading')).toBeInTheDocument();
        expect(screen.queryByTestId('growth-timeline')).not.toBeInTheDocument();
    });

    test('データなし + エラー時にエラーメッセージが表示される', () => {
        mockUseActionLogs.mockReturnValue({
            data: undefined,
            error: new Error('fetch failed'),
            isLoading: false,
        });

        render(<StatsContent userId={MOCK_USER_ID} />);

        expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
        expect(screen.queryByTestId('growth-timeline')).not.toBeInTheDocument();
    });

    test('データあり + 再検証エラー時はチャートを表示する', () => {
        mockUseActionLogs.mockReturnValue({
            data: MOCK_DATA,
            error: new Error('revalidation failed'),
            isLoading: false,
        });

        render(<StatsContent userId={MOCK_USER_ID} />);

        expect(screen.getByTestId('growth-timeline')).toBeInTheDocument();
        expect(screen.getByTestId('action-breakdown')).toBeInTheDocument();
        expect(screen.queryByText('データの取得に失敗しました')).not.toBeInTheDocument();
    });

    test('空データ時にチャートコンポーネントに空配列を渡す', () => {
        mockUseActionLogs.mockReturnValue({ data: [], error: null, isLoading: false });

        render(<StatsContent userId={MOCK_USER_ID} />);

        expect(capturedTimelineProps.actions).toEqual([]);
        expect(capturedBreakdownProps.actions).toEqual([]);
    });

    test('30日ボタンをクリックすると startDate が30日前になる', async () => {
        const user = userEvent.setup();

        render(<StatsContent userId={MOCK_USER_ID} />);

        await user.click(screen.getByRole('button', { name: '直近30日' }));

        const expected = daysAgo(30);
        const lastCall = mockUseActionLogsWithArgs.mock.calls.at(-1);
        expect(lastCall![1]).toBe(expected);
    });
});
