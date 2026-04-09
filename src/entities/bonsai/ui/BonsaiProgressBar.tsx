import { ProgressBar } from '@/shared/ui';

type BranchType = 'sprout' | 'leaf' | 'flower' | 'full';

type BranchDef = {
    type: BranchType;
    /** Position within the filled area (0–100) */
    position: number;
    /** Branch curves left (-1) or right (1) */
    direction: 1 | -1;
    /** Rotation angle in degrees from the base */
    angle: number;
};

/** Deterministic angle from position & index so it's stable across re-renders */
function branchAngle(position: number, index: number): number {
    return ((position * 7 + index * 13) % 31) - 15; // -15 ~ +15 deg
}

function getBranches(percent: number): BranchDef[] {
    const raw: Omit<BranchDef, 'angle'>[] = (() => {
        if (percent <= 0) return [];
        if (percent <= 20)
            return [{ type: 'sprout' as const, position: 85, direction: 1 as const }];
        if (percent <= 40)
            return [
                { type: 'sprout' as const, position: 40, direction: -1 as const },
                { type: 'leaf' as const, position: 85, direction: 1 as const },
            ];
        if (percent <= 60)
            return [
                { type: 'leaf' as const, position: 25, direction: -1 as const },
                { type: 'leaf' as const, position: 55, direction: 1 as const },
                { type: 'leaf' as const, position: 85, direction: -1 as const },
            ];
        if (percent <= 80)
            return [
                { type: 'leaf' as const, position: 20, direction: -1 as const },
                { type: 'leaf' as const, position: 45, direction: 1 as const },
                { type: 'flower' as const, position: 70, direction: -1 as const },
                { type: 'leaf' as const, position: 90, direction: 1 as const },
            ];
        return [
            { type: 'leaf' as const, position: 12, direction: -1 as const },
            { type: 'leaf' as const, position: 30, direction: 1 as const },
            { type: 'flower' as const, position: 48, direction: -1 as const },
            { type: 'flower' as const, position: 66, direction: 1 as const },
            { type: 'full' as const, position: 88, direction: -1 as const },
        ];
    })();

    return raw.map((b, i) => ({ ...b, angle: branchAngle(b.position, i) }));
}

function Sprout() {
    return (
        <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
            <path d="M6 16 L6 10" stroke="#5b7a5e" strokeWidth="1.5" strokeLinecap="round" />
            <ellipse cx="6" cy="8" rx="2.5" ry="4" fill="#7a9e7e" transform="rotate(-15 6 8)" />
        </svg>
    );
}

function LeafBranch({ direction }: { direction: 1 | -1 }) {
    const flip = direction === -1;
    return (
        <svg width="20" height="22" viewBox="0 0 20 22" fill="none" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
            <path d="M10 22 L10 12 Q10 7 14 5" stroke="#8b6f4e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <ellipse cx="16" cy="4" rx="2.5" ry="4.5" fill="#5b7a5e" transform="rotate(-30 16 4)" />
            <ellipse cx="9" cy="10" rx="2" ry="3.5" fill="#7a9e7e" transform="rotate(20 9 10)" />
        </svg>
    );
}

function FlowerBranch({ direction }: { direction: 1 | -1 }) {
    const flip = direction === -1;
    return (
        <svg width="20" height="24" viewBox="0 0 20 24" fill="none" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
            <path d="M10 24 L10 14 Q10 9 14 6" stroke="#8b6f4e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <ellipse cx="9" cy="12" rx="2" ry="3.5" fill="#5b7a5e" transform="rotate(20 9 12)" />
            <circle cx="16" cy="4" r="1.6" fill="#c97c7c" />
            <circle cx="14" cy="3" r="1.4" fill="#c97c7c" opacity="0.8" />
            <circle cx="18" cy="3" r="1.4" fill="#c97c7c" opacity="0.8" />
            <circle cx="14.5" cy="5.5" r="1.4" fill="#c97c7c" opacity="0.8" />
            <circle cx="17.5" cy="5.5" r="1.4" fill="#c97c7c" opacity="0.8" />
            <circle cx="16" cy="4" r="1" fill="#e8b4b4" />
        </svg>
    );
}

function FullBloomBranch({ direction }: { direction: 1 | -1 }) {
    const flip = direction === -1;
    return (
        <svg width="24" height="28" viewBox="0 0 24 28" fill="none" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
            <path d="M12 28 L12 16 Q12 10 16 7" stroke="#8b6f4e" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M12 20 Q8 17 6 13" stroke="#8b6f4e" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <ellipse cx="10" cy="14" rx="2" ry="3.5" fill="#5b7a5e" transform="rotate(15 10 14)" />
            <ellipse cx="5" cy="11" rx="1.8" ry="3.5" fill="#7a9e7e" transform="rotate(-10 5 11)" />
            {[0, 72, 144, 216, 288].map((angle) => (
                <ellipse
                    key={angle}
                    cx="18"
                    cy="5"
                    rx="2"
                    ry="3.5"
                    fill="#c97c7c"
                    opacity="0.7"
                    transform={`rotate(${angle} 18 5)`}
                />
            ))}
            <circle cx="18" cy="5" r="1.5" fill="#e8b4b4" />
        </svg>
    );
}

const BRANCH_COMPONENTS: Record<BranchType, React.FC<{ direction: 1 | -1 }>> = {
    sprout: () => <Sprout />,
    leaf: LeafBranch,
    flower: FlowerBranch,
    full: FullBloomBranch,
};

const BRANCH_HEIGHTS: Record<BranchType, number> = {
    sprout: 16,
    leaf: 22,
    flower: 24,
    full: 28,
};

type BonsaiProgressBarProps = {
    current: number;
    target: number;
    className?: string;
};

export function BonsaiProgressBar({ current, target, className }: BonsaiProgressBarProps) {
    const percent = target <= 0 ? 0 : Math.min(Math.max((current / target) * 100, 0), 100);
    const rounded = Math.round(percent);
    const branches = getBranches(rounded);

    const maxHeight = branches.length > 0
        ? Math.max(...branches.map((b) => BRANCH_HEIGHTS[b.type]))
        : 0;

    return (
        <div className={className}>
            <div className="flex items-center justify-between text-sm mb-3 text-sub">
                <span>{current} / {target}</span>
                <span>{rounded}%</span>
            </div>
            <div className="relative" style={{ marginTop: maxHeight }}>
                {branches.map(({ type, position, direction, angle }, i) => {
                    const Component = BRANCH_COMPONENTS[type];
                    return (
                        <div
                            key={i}
                            className="absolute transition-all duration-500"
                            style={{
                                left: `${(position / 100) * rounded}%`,
                                bottom: '100%',
                                transform: `translateX(-50%) rotate(${angle}deg)`,
                                transformOrigin: 'bottom center',
                            }}
                            role="img"
                            aria-hidden="true"
                        >
                            <Component direction={direction} />
                        </div>
                    );
                })}
                <ProgressBar current={current} target={target} className="[&>div:first-child]:hidden" />
            </div>
        </div>
    );
}
