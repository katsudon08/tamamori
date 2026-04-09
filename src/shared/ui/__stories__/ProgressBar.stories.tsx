import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { ProgressBar } from '../ProgressBar';

const meta = {
    title: 'shared/ui/ProgressBar',
    component: ProgressBar,
    tags: ['autodocs'],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: { current: 0, target: 100 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('0 / 100')).toBeInTheDocument();
        await expect(canvas.getByText('0%')).toBeInTheDocument();
        await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    },
};

export const Half: Story = {
    args: { current: 50, target: 100 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('50 / 100')).toBeInTheDocument();
        await expect(canvas.getByText('50%')).toBeInTheDocument();
        await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    },
};

export const Full: Story = {
    args: { current: 100, target: 100 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('100 / 100')).toBeInTheDocument();
        await expect(canvas.getByText('100%')).toBeInTheDocument();
        await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    },
};

export const Light: Story = {
    args: { current: 60, target: 100, variant: 'light' },
};

export const Dark: Story = {
    args: { current: 60, target: 100, variant: 'dark' },
    decorators: [(Story) => <div className="bg-gray-900 p-4 rounded"><Story /></div>],
};
