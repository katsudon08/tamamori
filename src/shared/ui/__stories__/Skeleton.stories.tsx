import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { Skeleton } from '../Skeleton';

const meta = {
    title: 'shared/ui/Skeleton',
    component: Skeleton,
    tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { className: 'h-10 w-40' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const el = canvas.getByRole('status');
        await expect(el).toHaveAttribute('aria-label', '読み込み中');
    },
};

export const Circle: Story = {
    args: { shape: 'circle', className: 'h-12 w-12' },
};

export const NoAnimation: Story = {
    args: { animate: false, className: 'h-10 w-40' },
};

export const Grid: Story = {
    render: () => (
        <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
        </div>
    ),
};

export const BonsaiPageLayout: Story = {
    render: () => (
        <div className="flex flex-col gap-6 md:flex-row">
            <Skeleton className="min-h-[300px] flex-1 rounded-lg" />
            <div className="w-80 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                    <Skeleton shape="circle" className="h-12 w-12" />
                    <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-3 w-full rounded-md" />
            </div>
        </div>
    ),
};

export const Light: Story = {
    args: { variant: 'light', className: 'h-10 w-40' },
};

export const Dark: Story = {
    args: { variant: 'dark', className: 'h-10 w-40' },
    decorators: [
        (Story) => (
            <div className="bg-gray-900 p-4 rounded">
                <Story />
            </div>
        ),
    ],
};
