import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { GrowthParticles } from '../GrowthParticles';
import { R3FDecorator } from './_R3FDecorator';

const meta = {
    title: 'entities/bonsai/GrowthParticles',
    component: GrowthParticles,
    decorators: [R3FDecorator],
    tags: ['autodocs'],
} satisfies Meta<typeof GrowthParticles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inactive: Story = {
    args: { active: false },
};

export const Active: Story = {
    args: { active: true },
};
