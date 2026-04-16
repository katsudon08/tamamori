/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ErrorFallback } from '../ErrorFallback';

describe('ErrorFallback', () => {
    test('role="alert" を持つ', () => {
        render(<ErrorFallback />);

        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('data-testid="error-fallback" を持つ', () => {
        render(<ErrorFallback />);

        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    });

    test('デフォルトのタイトルとメッセージが表示される', () => {
        render(<ErrorFallback />);

        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
        expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
    });

    test('カスタムタイトルとメッセージが表示される', () => {
        render(<ErrorFallback title="3D描画エラー" message="WebGLの描画に失敗しました" />);

        expect(screen.getByText('3D描画エラー')).toBeInTheDocument();
        expect(screen.getByText('WebGLの描画に失敗しました')).toBeInTheDocument();
    });

    test('onRetry 未指定時はボタンが表示されない', () => {
        render(<ErrorFallback />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('onRetry 指定時に再試行ボタンが表示される', () => {
        render(<ErrorFallback onRetry={() => {}} />);

        expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument();
    });

    test('再試行ボタンクリックで onRetry が呼ばれる', async () => {
        const handleRetry = jest.fn();
        const user = userEvent.setup();

        render(<ErrorFallback onRetry={handleRetry} />);
        await user.click(screen.getByRole('button', { name: '再試行' }));

        expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    test('className が渡される', () => {
        render(<ErrorFallback className="mt-8" />);

        expect(screen.getByTestId('error-fallback').className).toContain('mt-8');
    });

    test('tamamori バリアントのスタイルがデフォルトで適用される', () => {
        render(<ErrorFallback />);

        const title = screen.getByText('エラーが発生しました');
        expect(title.className).toContain('text-accent');
    });
});
