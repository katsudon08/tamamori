/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// --- mocks ---------------------------------------------------------------

const mockClearSessionToken = jest.fn();
const mockNavigateTo = jest.fn();

jest.mock('@/shared/lib/supabase', () => ({
    clearSessionToken: () => mockClearSessionToken(),
}));

jest.mock('../navigate', () => ({
    navigateTo: (url: string) => mockNavigateTo(url),
}));

import { LogoutButton } from '../LogoutButton';

// --- helpers -------------------------------------------------------------

beforeEach(() => {
    jest.clearAllMocks();
});

// --- tests ---------------------------------------------------------------

describe('LogoutButton', () => {
    test('「ログアウト」リンクとして描画される (a タグ + href)', () => {
        render(<LogoutButton />);
        const link = screen.getByRole('link', { name: 'ログアウト' });
        expect(link.tagName).toBe('A');
        expect(link.getAttribute('href')).toBe('/api/auth/logout');
    });

    test('クリック時に clearSessionToken が呼ばれる', () => {
        render(<LogoutButton />);
        const link = screen.getByRole('link', { name: 'ログアウト' });

        fireEvent.click(link);

        expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
    });

    test('クリック時にデフォルト遷移を抑止し /api/auth/logout に navigateTo で遷移する', () => {
        render(<LogoutButton />);
        const link = screen.getByRole('link', { name: 'ログアウト' });

        fireEvent.click(link);

        expect(mockNavigateTo).toHaveBeenCalledWith('/api/auth/logout');
    });

    test('clearSessionToken は遷移より先に呼ばれる (in-memory JWT 破棄を navigation 前に保証)', () => {
        render(<LogoutButton />);
        const link = screen.getByRole('link', { name: 'ログアウト' });

        fireEvent.click(link);

        const clearOrder = mockClearSessionToken.mock.invocationCallOrder[0]!;
        const navigateOrder = mockNavigateTo.mock.invocationCallOrder[0]!;
        expect(clearOrder).toBeLessThan(navigateOrder);
    });

    test('className が指定された場合に a 要素に適用される', () => {
        render(<LogoutButton className="text-sm text-sub hover:text-main" />);
        const link = screen.getByRole('link', { name: 'ログアウト' });
        expect(link.className).toContain('text-sm');
        expect(link.className).toContain('text-sub');
    });
});
