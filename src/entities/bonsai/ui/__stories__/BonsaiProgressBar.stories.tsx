import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { BonsaiProgressBar } from '../BonsaiProgressBar';

const meta = {
    title: 'entities/bonsai/BonsaiProgressBar',
    component: BonsaiProgressBar,
    tags: ['autodocs'],
} satisfies Meta<typeof BonsaiProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: { current: 0, target: 100 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
        await expect(canvas.queryAllByRole('img', { hidden: true })).toHaveLength(0);
    },
};

export const Sprout: Story = {
    args: { current: 15, target: 100 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '15');
        await expect(canvas.getAllByRole('img', { hidden: true })).toHaveLength(1);
    },
};

export const Growing: Story = {
    args: { current: 50, target: 100 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
        await expect(canvas.getAllByRole('img', { hidden: true })).toHaveLength(3);
    },
};

export const Blooming: Story = {
    args: { current: 75, target: 100 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
        await expect(canvas.getAllByRole('img', { hidden: true })).toHaveLength(4);
    },
};

export const Full: Story = {
    args: { current: 100, target: 100 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
        await expect(canvas.getAllByRole('img', { hidden: true })).toHaveLength(5);
    },
};
