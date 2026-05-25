import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BonsaiScene } from '../BonsaiScene';
import { SEED_STATE, BRANCHING_STATE, FULL_BLOOM_STATE } from './_fixtures';

const meta = {
    title: 'entities/bonsai/BonsaiScene',
    component: BonsaiScene,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story) => (
            <div style={{ height: '600px' }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof BonsaiScene>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeedScene: Story = {
    args: { visualState: SEED_STATE },
};

export const BranchingScene: Story = {
    args: { visualState: BRANCHING_STATE },
};

export const FullBloomScene: Story = {
    args: { visualState: FULL_BLOOM_STATE },
};
