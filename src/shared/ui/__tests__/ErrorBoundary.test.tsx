/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ErrorBoundary } from '../ErrorBoundary';

// console.error を抑制 (React が Error Boundary 発火時に出力するため)
let consoleSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    consoleSpy.mockRestore();
});

function ThrowingChild({ message = 'test error' }: { message?: string }): never {
    throw new Error(message);
}

function NormalChild() {
    return <div>正常なコンテンツ</div>;
}

describe('ErrorBoundary', () => {
    test('エラーがない場合は children を表示する', () => {
        render(
            <ErrorBoundary>
                <NormalChild />
            </ErrorBoundary>,
        );

        expect(screen.getByText('正常なコンテンツ')).toBeInTheDocument();
    });

    test('子のエラーをキャッチして fallback を表示する', () => {
        render(
            <ErrorBoundary fallback={<div>エラーフォールバック</div>}>
                <ThrowingChild />
            </ErrorBoundary>,
        );

        expect(screen.getByText('エラーフォールバック')).toBeInTheDocument();
        expect(screen.queryByText('正常なコンテンツ')).not.toBeInTheDocument();
    });

    test('fallbackRender にエラーと reset を渡す', () => {
        render(
            <ErrorBoundary fallbackRender={({ error }) => <div>エラー: {error.message}</div>}>
                <ThrowingChild message="カスタムエラー" />
            </ErrorBoundary>,
        );

        expect(screen.getByText('エラー: カスタムエラー')).toBeInTheDocument();
    });

    test('fallback も fallbackRender も未指定の場合はデフォルト ErrorFallback を表示する', () => {
        render(
            <ErrorBoundary>
                <ThrowingChild />
            </ErrorBoundary>,
        );

        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    });

    test('onError コールバックが呼ばれる', () => {
        const handleError = jest.fn();

        render(
            <ErrorBoundary onError={handleError} fallback={<div>fallback</div>}>
                <ThrowingChild message="テストエラー" />
            </ErrorBoundary>,
        );

        expect(handleError).toHaveBeenCalledTimes(1);
        expect(handleError.mock.calls[0]![0]).toBeInstanceOf(Error);
        expect((handleError.mock.calls[0]![0] as Error).message).toBe('テストエラー');
    });

    test('reset でエラー状態をクリアできる', async () => {
        let shouldThrow = true;
        const user = userEvent.setup();

        function ConditionalChild() {
            if (shouldThrow) throw new Error('error');
            return <div>復帰しました</div>;
        }

        render(
            <ErrorBoundary
                fallbackRender={({ reset }) => <button onClick={reset}>リセット</button>}
            >
                <ConditionalChild />
            </ErrorBoundary>,
        );

        expect(screen.getByText('リセット')).toBeInTheDocument();

        shouldThrow = false;
        await user.click(screen.getByText('リセット'));

        expect(screen.getByText('復帰しました')).toBeInTheDocument();
    });
});
