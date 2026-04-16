import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Image from 'next/image';
import Link from 'next/link';
import { expect, within } from 'storybook/test';

import { Header } from '../Header';

const meta = {
    title: 'shared/ui/Header',
    component: Header,
    tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Header
            rightSlot={
                <div className="flex items-center gap-2">
                    <Image
                        src="https://via.placeholder.com/32"
                        alt="avatar"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                        unoptimized
                    />
                    <span className="text-sm text-sub">テストユーザー</span>
                </div>
            }
        >
            <Link href="/garden">花壇</Link>
            <Link href="/bonsai/me">自分の盆栽</Link>
            <Link href="/stats">統計</Link>
        </Header>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('たま森')).toBeInTheDocument();
        await expect(canvas.getByText('花壇')).toBeInTheDocument();
        await expect(canvas.getByText('自分の盆栽')).toBeInTheDocument();
        await expect(canvas.getByText('統計')).toBeInTheDocument();
        await expect(canvas.getByText('テストユーザー')).toBeInTheDocument();
        await expect(canvas.getByAltText('avatar')).toBeInTheDocument();
    },
};

export const NavOnly: Story = {
    render: () => (
        <Header>
            <Link href="/garden">花壇</Link>
            <Link href="/bonsai/me">自分の盆栽</Link>
        </Header>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('たま森')).toBeInTheDocument();
        await expect(canvas.getByText('花壇')).toBeInTheDocument();
        await expect(canvas.getByText('自分の盆栽')).toBeInTheDocument();
    },
};

export const Light: Story = {
    render: () => (
        <Header variant="light">
            <Link href="/garden">花壇</Link>
            <Link href="/bonsai/me">自分の盆栽</Link>
            <Link href="/stats">統計</Link>
        </Header>
    ),
};

export const Dark: Story = {
    render: () => (
        <div className="bg-gray-900">
            <Header variant="dark">
                <Link href="/garden">花壇</Link>
                <Link href="/bonsai/me">自分の盆栽</Link>
                <Link href="/stats">統計</Link>
            </Header>
        </div>
    ),
};
