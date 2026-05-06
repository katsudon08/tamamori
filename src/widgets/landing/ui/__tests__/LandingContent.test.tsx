/**
 * @jest-environment jsdom
 */
import { describe, test, expect } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

import { LandingContent } from '../LandingContent';

describe('LandingContent', () => {
    test('「Sign in with Slack」リンクが表示される', () => {
        render(<LandingContent />);

        const link = screen.getByRole('link', { name: /sign in with slack/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/api/auth/slack');
    });

    test('エラーパラメータ付きでエラーメッセージが表示される', () => {
        render(<LandingContent error="auth_failed" />);

        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('認証に失敗しました');
    });

    test('session_expired の場合は再ログインを促すメッセージが表示される', () => {
        render(<LandingContent error="session_expired" />);

        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('セッションの有効期限が切れました');
    });

    test('エラーパラメータなしではエラーメッセージが表示されない', () => {
        render(<LandingContent />);

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
