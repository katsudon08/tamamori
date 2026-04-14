import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { GardenViewer } from '../GardenViewer';
import { MOCK_GARDEN_6, MOCK_GARDEN_MIXED } from './_fixtures';

const meta = {
    title: 'widgets/garden-viewer/GardenViewer',
    component: GardenViewer,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div style={{ height: '600px' }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof GardenViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 6盆栽: seed〜budding の各ステージ */
export const SixBonsai: Story = {
    args: { bonsaiList: MOCK_GARDEN_6 },
};

/** 8盆栽: 全ステージ (seed〜full_bloom) */
export const MixedStages: Story = {
    args: { bonsaiList: MOCK_GARDEN_MIXED },
};
