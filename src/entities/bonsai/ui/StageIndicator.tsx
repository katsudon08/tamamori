import type { GrowthStage } from '../model/types';

const STAGE_CONFIG: Record<GrowthStage, { label: string; icon: string }> = {
    seed: { label: '種まき', icon: '\u{1F330}' },
    sprout: { label: '発芽', icon: '\u{1F331}' },
    young: { label: '若木が育つ', icon: '\u{1F33F}' },
    branching: { label: '枝が伸びる', icon: '\u{1FAB5}' },
    leafy: { label: '葉が茂る', icon: '\u{1F343}' },
    budding: { label: 'つぼみがつく', icon: '\u{1F337}' },
    flowering: { label: '花が咲く', icon: '\u{1F338}' },
    full_bloom: { label: '満開', icon: '\u{1F4AE}' },
};

type StageIndicatorProps = {
    stage: GrowthStage;
};

export function StageIndicator({ stage }: StageIndicatorProps) {
    const { label, icon } = STAGE_CONFIG[stage];

    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-main-light text-main text-sm">
            <span role="img" aria-hidden="true">
                {icon}
            </span>
            <span>{label}</span>
        </span>
    );
}
