import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Pot } from '../Pot';
import { R3FDecorator } from './_R3FDecorator';

const meta = {
    title: 'entities/bonsai/Pot',
    component: Pot,
    decorators: [R3FDecorator],
    tags: ['autodocs'],
} satisfies Meta<typeof Pot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { potColor: '#8B4513' },
};

export const CustomColor: Story = {
    args: { potColor: '#4a6741' },
};
