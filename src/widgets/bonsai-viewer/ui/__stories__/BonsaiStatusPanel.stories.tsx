import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { BonsaiStatusPanel } from '../BonsaiStatusPanel';
import { makeBonsai, getNextStageThresholds, MOCK_USER, MOCK_USER_NO_AVATAR } from './_fixtures';

function makeArgs(stage: Parameters<typeof makeBonsai>[0]) {
    const bonsai = makeBonsai(stage);
    return {
        stage: bonsai.growth_stage,
        totalMessages: bonsai.total_messages,
        totalReactions: bonsai.total_reactions,
        totalThanks: bonsai.total_thanks,
        user: MOCK_USER,
        nextStageThresholds: getNextStageThresholds(stage),
    };
}

const meta = {
    title: 'widgets/bonsai-viewer/BonsaiStatusPanel',
    component: BonsaiStatusPanel,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div style={{ width: 384 }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof BonsaiStatusPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Seed: Story = {
    args: makeArgs('seed'),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('種まき')).toBeInTheDocument();
        await expect(canvas.getByText('テストユーザー')).toBeInTheDocument();
    },
};

export const Sprout: Story = {
    args: makeArgs('sprout'),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('発芽')).toBeInTheDocument();
    },
};

export const Young: Story = {
    args: makeArgs('young'),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('若木が育つ')).toBeInTheDocument();
    },
};

export const Branching: Story = {
    args: makeArgs('branching'),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('枝が伸びる')).toBeInTheDocument();
        await expect(canvas.getByText('40')).toBeInTheDocument();
        await expect(canvas.getByText('20')).toBeInTheDocument();
        await expect(canvas.getByText('5')).toBeInTheDocument();
    },
};

export const Leafy: Story = {
    args: makeArgs('leafy'),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('葉が茂る')).toBeInTheDocument();
    },
};

export const Budding: Story = {
    args: makeArgs('budding'),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('つぼみがつく')).toBeInTheDocument();
    },
};

export const Flowering: Story = {
    args: makeArgs('flowering'),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('花が咲く')).toBeInTheDocument();
    },
};

export const FullBloom: Story = {
    args: makeArgs('full_bloom'),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('満開')).toBeInTheDocument();
        await expect(canvas.getByText('満開です！')).toBeInTheDocument();
    },
};

export const NoAvatar: Story = {
    args: {
        ...makeArgs('branching'),
        user: MOCK_USER_NO_AVATAR,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('ア')).toBeInTheDocument();
        await expect(canvas.getByText('アバターなしユーザー')).toBeInTheDocument();
    },
};
