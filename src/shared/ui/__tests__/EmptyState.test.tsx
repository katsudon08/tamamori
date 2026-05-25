/**
 * @jest-environment jsdom
 */
import { describe, test, expect } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
    test('title が表示される', () => {
        render(<EmptyState title="データがありません" />);

        expect(screen.getByText('データがありません')).toBeInTheDocument();
    });

    test('data-testid="empty-state" を持つ', () => {
        render(<EmptyState title="テスト" />);

        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    test('description が表示される', () => {
        render(<EmptyState title="テスト" description="詳細な説明文" />);

        expect(screen.getByText('詳細な説明文')).toBeInTheDocument();
    });

    test('description が未指定の場合は表示されない', () => {
        const { container } = render(<EmptyState title="テスト" />);

        const paragraphs = container.querySelectorAll('p');
        expect(paragraphs).toHaveLength(0);
    });

    test('icon スロットが表示される', () => {
        render(<EmptyState title="テスト" icon={<span data-testid="icon">🌱</span>} />);

        expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    test('action スロットが表示される', () => {
        render(
            <EmptyState
                title="テスト"
                action={<button data-testid="action-btn">アクション</button>}
            />,
        );

        expect(screen.getByTestId('action-btn')).toBeInTheDocument();
    });

    test('className が渡される', () => {
        render(<EmptyState title="テスト" className="py-12" />);

        expect(screen.getByTestId('empty-state').className).toContain('py-12');
    });

    test('tamamori バリアントのスタイルがデフォルトで適用される', () => {
        render(<EmptyState title="テスト" />);

        const title = screen.getByText('テスト');
        expect(title.className).toContain('text-main');
    });

    test('light バリアントのスタイルが適用される', () => {
        render(<EmptyState title="テスト" description="説明" variant="light" />);

        const title = screen.getByText('テスト');
        expect(title.className).toContain('text-gray-900');
        const desc = screen.getByText('説明');
        expect(desc.className).toContain('text-gray-500');
    });
});
