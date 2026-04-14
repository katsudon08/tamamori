import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { ActionBreakdown } from '../ActionBreakdown';
import { MOCK_ACTIONS_2WEEKS, MOCK_ACTIONS_EMPTY, MOCK_ACTIONS_MESSAGE_HEAVY } from './_fixtures';

const meta = {
    title: 'widgets/stats-panel/ActionBreakdown',
    component: ActionBreakdown,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div style={{ width: '100%', maxWidth: 500 }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ActionBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { actions: MOCK_ACTIONS_2WEEKS },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('メッセージ')).toBeInTheDocument();
        await expect(canvas.getByText('リアクション')).toBeInTheDocument();
        await expect(canvas.getByText('感謝')).toBeInTheDocument();
    },
};

export const Empty: Story = {
    args: { actions: MOCK_ACTIONS_EMPTY },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('まだアクションがありません')).toBeInTheDocument();
    },
};

export const MessageHeavy: Story = {
    args: { actions: MOCK_ACTIONS_MESSAGE_HEAVY },
};
