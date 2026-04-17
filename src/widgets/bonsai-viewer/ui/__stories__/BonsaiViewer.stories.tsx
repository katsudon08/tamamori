import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BonsaiViewer } from '../BonsaiViewer';
import { makeBonsai, getNextStageThresholds, MOCK_USER } from './_fixtures';

function makeArgs(stage: Parameters<typeof makeBonsai>[0]) {
    return {
        bonsai: makeBonsai(stage),
        user: MOCK_USER,
        nextStageThresholds: getNextStageThresholds(stage),
    };
}

const meta = {
    title: 'widgets/bonsai-viewer/BonsaiViewer',
    component: BonsaiViewer,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div style={{ height: '100vh', width: '100%' }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof BonsaiViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Seed: Story = { args: makeArgs('seed') };

export const Sprout: Story = { args: makeArgs('sprout') };

export const Young: Story = { args: makeArgs('young') };

export const Branching: Story = { args: makeArgs('branching') };

export const Leafy: Story = { args: makeArgs('leafy') };

export const Budding: Story = { args: makeArgs('budding') };

export const Flowering: Story = { args: makeArgs('flowering') };

export const FullBloom: Story = { args: makeArgs('full_bloom') };
