import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { LandingContent } from '../LandingContent';

const meta = {
    title: 'widgets/landing/LandingContent',
    component: LandingContent,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
    },
} satisfies Meta<typeof LandingContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {},
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('たま森')).toBeInTheDocument();
        const link = canvas.getByRole('link', { name: /sign in with slack/i });
        await expect(link).toBeInTheDocument();
        await expect(link).toHaveAttribute('href', '/api/auth/slack');
        await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    },
};

export const WithError: Story = {
    args: { error: 'auth_failed' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const alert = canvas.getByRole('alert');
        await expect(alert).toBeInTheDocument();
        await expect(alert).toHaveTextContent('認証に失敗しました');
        await expect(canvas.getByRole('link', { name: /sign in with slack/i })).toBeInTheDocument();
    },
};
