/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

type SwrConfigValue = {
    onError?: (error: unknown) => void;
    onErrorRetry?: (
        error: unknown,
        key: unknown,
        config: unknown,
        revalidate: (options: { retryCount: number }) => void,
        context: { retryCount: number },
    ) => void;
};

let capturedValue: SwrConfigValue | null = null;

jest.mock('swr', () => ({
    SWRConfig: ({ value, children }: { value: SwrConfigValue; children: ReactNode }) => {
        capturedValue = value;
        return <>{children}</>;
    },
}));

const mockHandleSessionExpired = jest.fn();
const mockIsSessionExpiredError = jest.fn<(error: unknown) => boolean>();

jest.mock('@/shared/lib/auth/session-expired', () => ({
    handleSessionExpired: () => mockHandleSessionExpired(),
    isSessionExpiredError: (error: unknown) => mockIsSessionExpiredError(error),
}));

import { SWRProvider } from '../SWRProvider';

describe('SWRProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        capturedValue = null;
        mockIsSessionExpiredError.mockReturnValue(false);
    });

    test('children を描画する', () => {
        render(
            <SWRProvider>
                <div>content</div>
            </SWRProvider>,
        );

        expect(screen.getByText('content')).toBeInTheDocument();
    });

    test('onError で session_expired を検知したら再ログイン導線へ流す', () => {
        mockIsSessionExpiredError.mockReturnValueOnce(true);
        render(<SWRProvider>content</SWRProvider>);

        capturedValue!.onError!(new Error('session_expired'));

        expect(mockHandleSessionExpired).toHaveBeenCalledTimes(1);
    });

    test('onErrorRetry は session_expired を retry しない', () => {
        mockIsSessionExpiredError.mockReturnValueOnce(true);
        const revalidate = jest.fn();
        render(<SWRProvider>content</SWRProvider>);

        capturedValue!.onErrorRetry!(new Error('session_expired'), 'key', {}, revalidate, {
            retryCount: 0,
        });

        expect(mockHandleSessionExpired).toHaveBeenCalledTimes(1);
        expect(revalidate).not.toHaveBeenCalled();
    });
});
