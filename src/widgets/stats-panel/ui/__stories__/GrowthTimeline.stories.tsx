import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { GrowthTimeline } from '../GrowthTimeline';
import { MOCK_ACTIONS_2WEEKS, MOCK_ACTIONS_EMPTY, MOCK_ACTIONS_MESSAGES_ONLY } from './_fixtures';

const meta = {
    title: 'widgets/stats-panel/GrowthTimeline',
    component: GrowthTimeline,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div style={{ width: '100%', maxWidth: 700 }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof GrowthTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { actions: MOCK_ACTIONS_2WEEKS },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('figure')).toBeInTheDocument();
    },
};

export const Empty: Story = {
    args: { actions: MOCK_ACTIONS_EMPTY },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('データがありません')).toBeInTheDocument();
    },
};

export const MessagesOnly: Story = {
    args: { actions: MOCK_ACTIONS_MESSAGES_ONLY },
};
