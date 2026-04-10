import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Leaves } from '../Leaves';
import { Trunk } from '../Trunk';
import { Branch } from '../Branch';
import { R3FDecorator } from './_R3FDecorator';
import { BRANCHING_STATE } from './_fixtures';

const branches = BRANCHING_STATE.branches;

const meta = {
    title: 'entities/bonsai/Leaves',
    component: Leaves,
    decorators: [
        (Story) => (
            <>
                <Trunk height={1.0} thickness={0.12} />
                {branches.map((b, i) => (
                    <Branch key={i} {...b} trunkHeight={1.0} index={i} />
                ))}
                <Story />
            </>
        ),
        R3FDecorator,
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof Leaves>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FewLeaves: Story = {
    args: {
        count: 10,
        color: '#228B22',
        branches,
        trunkHeight: 1.0,
    },
};

export const ManyLeaves: Story = {
    args: {
        count: 80,
        color: '#228B22',
        branches,
        trunkHeight: 1.0,
    },
};
