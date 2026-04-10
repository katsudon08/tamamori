import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Trunk } from '../Trunk';
import { R3FDecorator } from './_R3FDecorator';

const meta = {
    title: 'entities/bonsai/Trunk',
    component: Trunk,
    decorators: [R3FDecorator],
    tags: ['autodocs'],
} satisfies Meta<typeof Trunk>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeedStage: Story = {
    args: { height: 0.3, thickness: 0.05 },
};

export const FullBloomStage: Story = {
    args: { height: 2.0, thickness: 0.25 },
};
