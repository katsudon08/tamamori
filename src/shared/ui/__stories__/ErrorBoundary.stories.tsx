import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorFallback } from '../ErrorFallback';

const meta = {
    title: 'shared/ui/ErrorBoundary',
    component: ErrorBoundary,
    tags: ['autodocs'],
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
    args: {
        children: <div className="p-4 text-main">正常なコンテンツ</div>,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('正常なコンテンツ')).toBeInTheDocument();
    },
};

function ThrowingComponent(): never {
    throw new Error('Storybook テストエラー');
}

export const Caught: Story = {
    args: {
        children: null,
    },
    render: () => (
        <ErrorBoundary fallback={<ErrorFallback title="キャッチされたエラー" />}>
            <ThrowingComponent />
        </ErrorBoundary>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('キャッチされたエラー')).toBeInTheDocument();
    },
};

export const WithReset: Story = {
    args: {
        children: null,
    },
    render: () => (
        <ErrorBoundary
            fallbackRender={({ error, reset }) => (
                <ErrorFallback title="エラー発生" message={error.message} onRetry={reset} />
            )}
        >
            <ThrowingComponent />
        </ErrorBoundary>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('alert')).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: '再試行' })).toBeInTheDocument();
    },
};
