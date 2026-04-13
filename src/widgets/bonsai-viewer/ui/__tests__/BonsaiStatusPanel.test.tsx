/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

jest.mock('@/shared/config', () => ({ env: {} }));
jest.mock('@/shared/lib/supabase', () => ({
    createServerClient: () => ({}),
    createBrowserClient: () => ({}),
}));

import { BonsaiStatusPanel } from '../BonsaiStatusPanel';

const DEFAULT_PROPS = {
    stage: 'branching' as const,
    totalMessages: 40,
    totalReactions: 20,
    totalThanks: 5,
    user: { display_name: 'テストユーザー', avatar_url: 'https://example.com/avatar.png' },
    nextStageThresholds: { min_messages: 60, min_reactions: 30, min_thanks: 10 },
};

describe('BonsaiStatusPanel', () => {
    test('ユーザー名が表示される', () => {
        render(<BonsaiStatusPanel {...DEFAULT_PROPS} />);

        expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    });

    test('アバター画像が正しいsrc/altで表示される', () => {
        render(<BonsaiStatusPanel {...DEFAULT_PROPS} />);

        const img = screen.getByRole('img', { name: 'テストユーザー' });
        expect(img.getAttribute('src')).toContain('avatar.png');
    });

    test('avatar_urlがnullの場合フォールバック表示', () => {
        render(
            <BonsaiStatusPanel
                {...DEFAULT_PROPS}
                user={{ display_name: 'アバターなし', avatar_url: null }}
            />,
        );

        expect(screen.queryByRole('img', { name: 'アバターなし' })).not.toBeInTheDocument();
        expect(screen.getByText('ア')).toBeInTheDocument();
    });

    test('ステージ名が表示される', () => {
        render(<BonsaiStatusPanel {...DEFAULT_PROPS} />);

        expect(screen.getByText('枝が伸びる')).toBeInTheDocument();
    });

    test('3種カウンター値が正しく表示される', () => {
        render(<BonsaiStatusPanel {...DEFAULT_PROPS} />);

        expect(screen.getByText('40')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    test('進捗バーが表示される', () => {
        render(<BonsaiStatusPanel {...DEFAULT_PROPS} />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toBeInTheDocument();
    });

    test('進捗バーが正しい割合で表示される（ボトルネック方式）', () => {
        // messages: 40/60=66%, reactions: 20/30=66%, thanks: 5/10=50% → min=50%
        render(<BonsaiStatusPanel {...DEFAULT_PROPS} />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    });

    test('full_bloom（nextStageThresholds===null）時は満開メッセージ表示', () => {
        render(
            <BonsaiStatusPanel
                {...DEFAULT_PROPS}
                stage="full_bloom"
                nextStageThresholds={null}
            />,
        );

        expect(screen.getByText('満開')).toBeInTheDocument();
        expect(screen.getByText('満開です！')).toBeInTheDocument();
    });
});
