import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, fn } from 'storybook/test';

import { ErrorFallback } from '../ErrorFallback';

const meta = {
    title: 'shared/ui/ErrorFallback',
    component: ErrorFallback,
    tags: ['autodocs'],
} satisfies Meta<typeof ErrorFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('alert')).toBeInTheDocument();
        await expect(canvas.getByText('エラーが発生しました')).toBeInTheDocument();
        await expect(canvas.getByText('データの取得に失敗しました')).toBeInTheDocument();
    },
};

export const WithRetry: Story = {
    args: {
        onRetry: fn(),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: '再試行' })).toBeInTheDocument();
    },
};

export const CustomMessage: Story = {
    args: {
        title: '3D描画エラー',
        message: 'WebGLの描画に失敗しました。ブラウザを再読み込みしてください。',
        onRetry: fn(),
    },
};

export const Light: Story = {
    args: { variant: 'light' },
};

export const Dark: Story = {
    args: { variant: 'dark' },
    decorators: [
        (Story) => (
            <div className="bg-gray-900 p-4 rounded">
                <Story />
            </div>
        ),
    ],
};
