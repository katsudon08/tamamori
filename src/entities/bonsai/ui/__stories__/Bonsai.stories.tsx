import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Bonsai } from '../Bonsai';
import { R3FDecorator } from './_R3FDecorator';
import {
    SEED_STATE,
    SPROUT_STATE,
    BRANCHING_STATE,
    LEAFY_STATE,
    FULL_BLOOM_STATE,
} from './_fixtures';

const meta = {
    title: 'entities/bonsai/Bonsai',
    component: Bonsai,
    decorators: [R3FDecorator],
    tags: ['autodocs'],
} satisfies Meta<typeof Bonsai>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeedStage: Story = {
    args: { visualState: SEED_STATE },
};

export const SproutStage: Story = {
    args: { visualState: SPROUT_STATE },
};

export const BranchingStage: Story = {
    args: { visualState: BRANCHING_STATE },
};

export const LeafyStage: Story = {
    args: { visualState: LEAFY_STATE },
};

export const FullBloomStage: Story = {
    args: { visualState: FULL_BLOOM_STATE },
};

