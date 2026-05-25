'use client';

import { memo, useMemo } from 'react';
import type { BonsaiVisualState } from '../model/types';
import { MAX_MAIN_BRANCHES } from '../lib/bonsai-geometry';
import { Pot } from './Pot';
import { Trunk } from './Trunk';
import { Branch } from './Branch';
import { GrowthParticles } from './GrowthParticles';

type BonsaiProps = {
    visualState: BonsaiVisualState;
    previousVisualState?: BonsaiVisualState;
};

export const Bonsai = memo(function Bonsai({ visualState, previousVisualState }: BonsaiProps) {
    // パーティクル: previous → current で枝数が増えた場合にトリガー
    const showParticles = useMemo(() => {
        if (!previousVisualState) return false;
        return visualState.branches.length > previousVisualState.branches.length;
    }, [visualState, previousVisualState]);

    const branchCount = Math.min(visualState.branches.length, MAX_MAIN_BRANCHES);
    // 葉・花を各主枝に均等配分
    const leavesPerBranch = branchCount > 0 ? Math.ceil(visualState.leaves / branchCount) : 0;
    const flowersPerBranch = branchCount > 0 ? Math.ceil(visualState.flowers / branchCount) : 0;

    return (
        <group>
            <Pot potColor={visualState.potColor} />
            <Trunk
                height={visualState.trunkHeight}
                thickness={visualState.trunkThickness}
                leafCount={
                    visualState.trunkHeight >= 1.0 ? Math.round(visualState.leaves * 0.15) : 0
                }
                flowerCount={
                    visualState.trunkHeight >= 1.0 ? Math.round(visualState.flowers * 0.1) : 0
                }
                leafColor={visualState.leafColor}
                flowerColor={visualState.flowerColor}
                showTipBranches={branchCount > 0 && visualState.trunkHeight >= 1.0}
            />
            {visualState.branches.slice(0, MAX_MAIN_BRANCHES).map((branch, i) => (
                <Branch
                    key={i}
                    angle={branch.angle}
                    length={branch.length}
                    depth={branch.depth}
                    seed={branch.seed}
                    trunkHeight={visualState.trunkHeight}
                    trunkThickness={visualState.trunkThickness}
                    index={i}
                    totalBranches={branchCount}
                    leafCount={leavesPerBranch}
                    flowerCount={flowersPerBranch}
                    leafColor={visualState.leafColor}
                    flowerColor={visualState.flowerColor}
                />
            ))}
            <GrowthParticles active={showParticles} />
        </group>
    );
});
