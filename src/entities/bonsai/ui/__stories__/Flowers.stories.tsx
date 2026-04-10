import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Flowers } from '../Flowers';
import { Trunk } from '../Trunk';
import { Branch } from '../Branch';
import { R3FDecorator } from './_R3FDecorator';
import { BRANCHING_STATE } from './_fixtures';

const branches = BRANCHING_STATE.branches;

const meta = {
    title: 'entities/bonsai/Flowers',
    component: Flowers,
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
} satisfies Meta<typeof Flowers>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FewFlowers: Story = {
    args: {
        count: 5,
        color: '#FFB7C5',
        branches,
        trunkHeight: 1.0,
    },
};

export const ManyFlowers: Story = {
    args: {
        count: 30,
        color: '#FFB7C5',
        branches,
        trunkHeight: 1.0,
    },
};
