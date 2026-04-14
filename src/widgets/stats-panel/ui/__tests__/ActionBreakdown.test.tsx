/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeAll } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

import { ActionBreakdown } from '../ActionBreakdown';
import { MOCK_ACTIONS_2WEEKS, MOCK_ACTIONS_EMPTY } from '../__stories__/_fixtures';

beforeAll(() => {
    global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
});

describe('ActionBreakdown', () => {
    test('3種のアクションタイプ名が表示される', () => {
        render(<ActionBreakdown actions={MOCK_ACTIONS_2WEEKS} />);

        expect(screen.getByText('メッセージ')).toBeInTheDocument();
        expect(screen.getByText('リアクション')).toBeInTheDocument();
        expect(screen.getByText('感謝')).toBeInTheDocument();
    });

    test('空データ時に「まだアクションがありません」が表示される', () => {
        render(<ActionBreakdown actions={MOCK_ACTIONS_EMPTY} />);

        expect(screen.getByText('まだアクションがありません')).toBeInTheDocument();
    });
});
