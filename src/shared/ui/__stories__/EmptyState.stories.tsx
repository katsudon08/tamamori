import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { EmptyState } from '../EmptyState';

const meta = {
    title: 'shared/ui/EmptyState',
    component: EmptyState,
    tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { title: 'データがありません' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByTestId('empty-state')).toBeInTheDocument();
        await expect(canvas.getByText('データがありません')).toBeInTheDocument();
    },
};

export const WithDescription: Story = {
    args: {
        title: 'データがありません',
        description: '選択した期間にアクティビティがありません',
    },
};

export const WithIcon: Story = {
    args: {
        icon: <span>🌱</span>,
        title: 'ようこそ、たま森へ！',
        description: 'Slackで活動すると、あなたの盆栽が育ちます。',
    },
};

export const WithAction: Story = {
    args: {
        title: 'まだアクションがありません',
        description: 'Slackで活動するとここに表示されます',
        action: (
            <button className="rounded-full bg-main px-4 py-1.5 text-sm text-white">
                はじめる
            </button>
        ),
    },
};

export const Light: Story = {
    args: {
        variant: 'light',
        title: 'データがありません',
        description: '選択した期間にアクティビティがありません',
    },
};

export const Dark: Story = {
    args: {
        variant: 'dark',
        title: 'データがありません',
        description: '選択した期間にアクティビティがありません',
    },
    decorators: [
        (Story) => (
            <div className="bg-gray-900 p-4 rounded">
                <Story />
            </div>
        ),
    ],
};
