import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Branch } from '../Branch';
import { Trunk } from '../Trunk';
import { R3FDecorator } from './_R3FDecorator';

const meta = {
    title: 'entities/bonsai/Branch',
    component: Branch,
    decorators: [
        (Story) => (
            <>
                <Trunk height={1.5} thickness={0.12} />
                <Story />
            </>
        ),
        R3FDecorator,
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof Branch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleBranch: Story = {
    args: {
        angle: 40,
        length: 0.6,
        depth: 1,
        seed: 1001,
        trunkHeight: 1.5,
        index: 0,
        totalBranches: 1,
    },
};

export const WithSubBranches: Story = {
    args: {
        angle: 35,
        length: 0.7,
        depth: 1,
        seed: 2002,
        trunkHeight: 1.5,
        index: 2,
        totalBranches: 5,
    },
};

export const UpperBranch: Story = {
    args: {
        angle: -30,
        length: 0.5,
        depth: 1,
        seed: 3003,
        trunkHeight: 1.5,
        index: 4,
        totalBranches: 5,
    },
};
