/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeAll } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

import { GrowthTimeline } from '../GrowthTimeline';
import { MOCK_ACTIONS_2WEEKS, MOCK_ACTIONS_EMPTY } from '../__stories__/_fixtures';

beforeAll(() => {
    global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
});

describe('GrowthTimeline', () => {
    test('データが渡された時にチャートコンテナがレンダリングされる', () => {
        render(<GrowthTimeline actions={MOCK_ACTIONS_2WEEKS} />);

        const container = screen.getByRole('figure');
        expect(container).toBeInTheDocument();
    });

    test('空データ時に「データがありません」が表示される', () => {
        render(<GrowthTimeline actions={MOCK_ACTIONS_EMPTY} />);

        expect(screen.getByText('データがありません')).toBeInTheDocument();
    });
});
