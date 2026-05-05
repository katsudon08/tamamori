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
    test('「ログアウト」ボタンとして描画される', () => {
        render(<LogoutButton />);
        const button = screen.getByRole('button', { name: 'ログアウト' });
        expect(button.tagName).toBe('BUTTON');
        expect(button.getAttribute('type')).toBe('button');
    });

    test('クリック時に clearSessionToken が呼ばれる', () => {
        render(<LogoutButton />);
        const button = screen.getByRole('button', { name: 'ログアウト' });

        fireEvent.click(button);

        expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
    });

    test('クリック時に /api/auth/logout に navigateTo で遷移する', () => {
        render(<LogoutButton />);
        const button = screen.getByRole('button', { name: 'ログアウト' });

        fireEvent.click(button);

        expect(mockNavigateTo).toHaveBeenCalledWith('/api/auth/logout');
    });

    test('clearSessionToken は遷移より先に呼ばれる (in-memory JWT 破棄を navigation 前に保証)', () => {
        render(<LogoutButton />);
        const button = screen.getByRole('button', { name: 'ログアウト' });

        fireEvent.click(button);

        const clearOrder = mockClearSessionToken.mock.invocationCallOrder[0]!;
        const navigateOrder = mockNavigateTo.mock.invocationCallOrder[0]!;
        expect(clearOrder).toBeLessThan(navigateOrder);
    });

    test('className が指定された場合に button 要素に適用される', () => {
        render(<LogoutButton className="text-sm text-sub hover:text-main" />);
        const button = screen.getByRole('button', { name: 'ログアウト' });
        expect(button.className).toContain('text-sm');
        expect(button.className).toContain('text-sub');
    });
});
