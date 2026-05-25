import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { StageIndicator } from '../StageIndicator';

const meta = {
    title: 'entities/bonsai/StageIndicator',
    component: StageIndicator,
    tags: ['autodocs'],
} satisfies Meta<typeof StageIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Seed: Story = {
    args: { stage: 'seed' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('種まき')).toBeInTheDocument();
    },
};

export const Sprout: Story = {
    args: { stage: 'sprout' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('発芽')).toBeInTheDocument();
    },
};

export const Young: Story = {
    args: { stage: 'young' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('若木が育つ')).toBeInTheDocument();
    },
};

export const Branching: Story = {
    args: { stage: 'branching' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('枝が伸びる')).toBeInTheDocument();
    },
};

export const Leafy: Story = {
    args: { stage: 'leafy' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('葉が茂る')).toBeInTheDocument();
    },
};

export const Budding: Story = {
    args: { stage: 'budding' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('つぼみがつく')).toBeInTheDocument();
    },
};

export const Flowering: Story = {
    args: { stage: 'flowering' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('花が咲く')).toBeInTheDocument();
    },
};

export const FullBloom: Story = {
    args: { stage: 'full_bloom' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('満開')).toBeInTheDocument();
    },
};
