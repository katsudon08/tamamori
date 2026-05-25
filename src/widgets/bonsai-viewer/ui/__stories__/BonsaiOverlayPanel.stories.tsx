import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { BonsaiOverlayPanel } from '../BonsaiOverlayPanel';
import { BonsaiStatusPanel } from '../BonsaiStatusPanel';
import { makeBonsai, getNextStageThresholds, MOCK_USER } from './_fixtures';

function panelChildren() {
    const bonsai = makeBonsai('branching');
    return (
        <BonsaiStatusPanel
            stage={bonsai.growth_stage}
            totalMessages={bonsai.total_messages}
            totalReactions={bonsai.total_reactions}
            totalThanks={bonsai.total_thanks}
            user={MOCK_USER}
            nextStageThresholds={getNextStageThresholds(bonsai.growth_stage)}
        />
    );
}

const meta = {
    title: 'widgets/bonsai-viewer/BonsaiOverlayPanel',
    component: BonsaiOverlayPanel,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="relative h-dvh w-full bg-main-light">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof BonsaiOverlayPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** デスクトップ幅ではパネルが常時右下に表示される */
export const Default: Story = {
    args: { children: panelChildren() },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('枝が伸びる')).toBeInTheDocument();
    },
};

/** モバイル: 初期状態で FAB が表示され、パネルは隠れている */
export const MobileClosed: Story = {
    args: { children: panelChildren() },
    parameters: {
        viewport: { defaultViewport: 'mobile1' },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: '統計を表示' })).toBeInTheDocument();
    },
};

/** モバイル: FAB クリックでパネルが開く */
export const MobileToggleOpen: Story = {
    args: { children: panelChildren() },
    parameters: {
        viewport: { defaultViewport: 'mobile1' },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const openBtn = canvas.getByRole('button', { name: '統計を表示' });
        await userEvent.click(openBtn);
        await expect(canvas.getByRole('button', { name: '統計を閉じる' })).toBeInTheDocument();
        await expect(canvas.getByText('枝が伸びる')).toBeInTheDocument();
    },
};
