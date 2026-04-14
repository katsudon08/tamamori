/**
 * @jest-environment jsdom
 */
import { describe, test, expect } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

import { GardenBonsaiLabelContent } from '../GardenBonsaiLabel';

const DEFAULT_PROPS = {
    userId: '00000000-0000-0000-0000-000000000101',
    displayName: '田中太郎',
    avatarUrl: 'https://example.com/avatar1.png',
};

describe('GardenBonsaiLabelContent', () => {
    test('ユーザー名が表示される', () => {
        render(<GardenBonsaiLabelContent {...DEFAULT_PROPS} />);

        expect(screen.getByText('田中太郎')).toBeInTheDocument();
    });

    test('avatarUrlがある場合アバター画像が表示される', () => {
        render(<GardenBonsaiLabelContent {...DEFAULT_PROPS} />);

        const img = screen.getByRole('img', { name: '田中太郎' });
        expect(img.getAttribute('src')).toContain('avatar1.png');
    });

    test('avatarUrlがnullの場合名前の頭文字でフォールバック表示', () => {
        render(<GardenBonsaiLabelContent {...DEFAULT_PROPS} avatarUrl={null} />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.getByText('田')).toBeInTheDocument();
    });

    test('リンクのhrefが /bonsai/[userId] に一致する', () => {
        render(<GardenBonsaiLabelContent {...DEFAULT_PROPS} />);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/bonsai/00000000-0000-0000-0000-000000000101');
    });
});
