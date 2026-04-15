/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

// --- mocks ---------------------------------------------------------------

const mockUseAllBonsai = jest.fn<() => { data: unknown; error: unknown; isLoading: boolean }>();
const mockUseAllBonsaiRealtime = jest.fn();

jest.mock('@/entities/bonsai', () => ({
    useAllBonsai: () => mockUseAllBonsai(),
}));

jest.mock('@/features/realtime-sync', () => ({
    useAllBonsaiRealtime: () => mockUseAllBonsaiRealtime(),
}));

jest.mock('@/widgets/garden-viewer', () => ({
    GardenViewer: ({ bonsaiList }: { bonsaiList: unknown[] }) => (
        <div data-testid="garden-viewer" data-count={bonsaiList.length} />
    ),
}));

// --- helpers -------------------------------------------------------------

import { GardenContent } from '../GardenContent';

const MOCK_DATA = [
    { id: '1', user_id: 'u1', users: { display_name: 'User1', avatar_url: null } },
    { id: '2', user_id: 'u2', users: { display_name: 'User2', avatar_url: null } },
];

beforeEach(() => {
    jest.clearAllMocks();
    mockUseAllBonsai.mockReturnValue({ data: MOCK_DATA, error: null, isLoading: false });
});

// --- tests ---------------------------------------------------------------

describe('GardenContent', () => {
    test('useAllBonsai() フックを呼び出す', () => {
        render(<GardenContent />);

        expect(mockUseAllBonsai).toHaveBeenCalled();
    });

    test('useAllBonsaiRealtime() フックを呼び出す', () => {
        render(<GardenContent />);

        expect(mockUseAllBonsaiRealtime).toHaveBeenCalled();
    });

    test('SWR データを GardenViewer に渡す', () => {
        render(<GardenContent />);

        const viewer = screen.getByTestId('garden-viewer');
        expect(viewer).toHaveAttribute('data-count', '2');
    });

    test('data が undefined の場合は空配列を渡す', () => {
        mockUseAllBonsai.mockReturnValue({ data: undefined, error: null, isLoading: false });

        render(<GardenContent />);

        const viewer = screen.getByTestId('garden-viewer');
        expect(viewer).toHaveAttribute('data-count', '0');
    });

    test('isLoading 中はローディング表示される', () => {
        mockUseAllBonsai.mockReturnValue({ data: undefined, error: null, isLoading: true });

        render(<GardenContent />);

        expect(screen.getByTestId('loading')).toBeInTheDocument();
        expect(screen.queryByTestId('garden-viewer')).not.toBeInTheDocument();
    });

    test('データなし + エラー時にエラーメッセージが表示される', () => {
        mockUseAllBonsai.mockReturnValue({
            data: undefined,
            error: new Error('fetch failed'),
            isLoading: false,
        });

        render(<GardenContent />);

        expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
        expect(screen.queryByTestId('garden-viewer')).not.toBeInTheDocument();
    });

    test('fallback データあり + 再検証エラー時は GardenViewer を表示する', () => {
        mockUseAllBonsai.mockReturnValue({
            data: MOCK_DATA,
            error: new Error('revalidation failed'),
            isLoading: false,
        });

        render(<GardenContent />);

        expect(screen.getByTestId('garden-viewer')).toBeInTheDocument();
        expect(screen.queryByText('データの取得に失敗しました')).not.toBeInTheDocument();
    });
});
