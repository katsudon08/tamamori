import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { NavLink } from '../NavLink';

const meta = {
    title: 'shared/ui/NavLink',
    component: NavLink,
    tags: ['autodocs'],
    parameters: {
        nextjs: { appDirectory: true },
    },
} satisfies Meta<typeof NavLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
    args: {
        href: '/garden',
        children: '花壇',
    },
    parameters: {
        nextjs: {
            navigation: { pathname: '/garden' },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const link = canvas.getByRole('link', { name: '花壇' });
        await expect(link).toHaveAttribute('aria-current', 'page');
    },
};

export const Inactive: Story = {
    args: {
        href: '/garden',
        children: '花壇',
    },
    parameters: {
        nextjs: {
            navigation: { pathname: '/stats' },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const link = canvas.getByRole('link', { name: '花壇' });
        await expect(link).not.toHaveAttribute('aria-current');
    },
};

export const ActiveNestedPath: Story = {
    args: {
        href: '/bonsai/me',
        children: '自分の盆栽',
    },
    parameters: {
        nextjs: {
            navigation: { pathname: '/bonsai/me' },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const link = canvas.getByRole('link', { name: '自分の盆栽' });
        await expect(link).toHaveAttribute('aria-current', 'page');
    },
};

export const OtherUserBonsaiNotActive: Story = {
    args: {
        href: '/bonsai/me',
        children: '自分の盆栽',
        matchPaths: ['/bonsai/my-user-id'],
    },
    parameters: {
        nextjs: {
            navigation: { pathname: '/bonsai/other-user' },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const link = canvas.getByRole('link', { name: '自分の盆栽' });
        await expect(link).not.toHaveAttribute('aria-current');
    },
};

export const ActiveViaMatchPaths: Story = {
    args: {
        href: '/bonsai/me',
        children: '自分の盆栽',
        matchPaths: ['/bonsai/my-user-id'],
    },
    parameters: {
        nextjs: {
            navigation: { pathname: '/bonsai/my-user-id' },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const link = canvas.getByRole('link', { name: '自分の盆栽' });
        await expect(link).toHaveAttribute('aria-current', 'page');
    },
};

export const Light: Story = {
    args: {
        href: '/garden',
        children: '花壇',
        variant: 'light',
    },
    parameters: {
        nextjs: {
            navigation: { pathname: '/garden' },
        },
    },
};

export const Dark: Story = {
    args: {
        href: '/garden',
        children: '花壇',
        variant: 'dark',
    },
    parameters: {
        nextjs: {
            navigation: { pathname: '/garden' },
        },
    },
    render: (args) => (
        <div className="bg-gray-900 p-4">
            <NavLink {...args} />
        </div>
    ),
};
