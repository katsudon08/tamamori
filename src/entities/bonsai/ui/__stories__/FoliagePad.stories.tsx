import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { FoliagePad } from '../FoliagePad';
import { R3FDecorator } from './_R3FDecorator';

const meta = {
    title: 'entities/bonsai/FoliagePad',
    component: FoliagePad,
    decorators: [R3FDecorator],
    tags: ['autodocs'],
} satisfies Meta<typeof FoliagePad>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LeavesOnly: Story = {
    args: {
        leafCount: 30,
        flowerCount: 0,
        leafColor: '#228B22',
        flowerColor: '#FFB7C5',
        seed: 1001,
        padRadius: 0.35,
    },
};

export const FlowersOnly: Story = {
    args: {
        leafCount: 0,
        flowerCount: 15,
        leafColor: '#228B22',
        flowerColor: '#FFB7C5',
        seed: 2002,
        padRadius: 0.35,
    },
};

export const FullPad: Story = {
    args: {
        leafCount: 30,
        flowerCount: 10,
        leafColor: '#228B22',
        flowerColor: '#FFB7C5',
        seed: 3003,
        padRadius: 0.35,
    },
};

export const SmallPad: Story = {
    args: {
        leafCount: 15,
        flowerCount: 5,
        leafColor: '#228B22',
        flowerColor: '#FFB7C5',
        seed: 4004,
        padRadius: 0.2,
    },
};

export const LargePad: Story = {
    args: {
        leafCount: 50,
        flowerCount: 20,
        leafColor: '#228B22',
        flowerColor: '#FFB7C5',
        seed: 5005,
        padRadius: 0.5,
    },
};
