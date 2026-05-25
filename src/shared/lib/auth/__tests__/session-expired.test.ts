/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockClearSessionToken = jest.fn();
const mockNavigateTo = jest.fn();

jest.mock('../../supabase', () => ({
    clearSessionToken: () => mockClearSessionToken(),
}));

jest.mock('../../browser/navigate', () => ({
    navigateTo: (url: string) => mockNavigateTo(url),
}));

import {
    SESSION_EXPIRED_LOGOUT_URL,
    handleSessionExpired,
    isSessionExpiredError,
    resetSessionExpiredHandlingForTests,
} from '../session-expired';

describe('session-expired helper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetSessionExpiredHandlingForTests();
    });

    test('Error("session_expired") を session expired と判定する', () => {
        expect(isSessionExpiredError(new Error('session_expired'))).toBe(true);
        expect(isSessionExpiredError(new Error('other'))).toBe(false);
        expect(isSessionExpiredError('session_expired')).toBe(false);
    });

    test('handleSessionExpired は token-cache を破棄して logout route へ遷移する', () => {
        handleSessionExpired();

        expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
        expect(mockNavigateTo).toHaveBeenCalledWith(SESSION_EXPIRED_LOGOUT_URL);
    });

    test('handleSessionExpired は二重遷移を防ぐ', () => {
        handleSessionExpired();
        handleSessionExpired();

        expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
        expect(mockNavigateTo).toHaveBeenCalledTimes(1);
    });
});
