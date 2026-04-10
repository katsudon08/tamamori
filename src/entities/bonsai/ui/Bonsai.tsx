'use client';

import { memo, useRef, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
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

type AnimatedSnapshot = {
    trunkHeight: number;
    trunkThickness: number;
    leaves: number;
    flowers: number;
    potColor: string;
    leafColor: string;
    flowerColor: string;
    branchLengths: number[];
};

const LERP_SPEED = 3;
const EPSILON = 0.001;

function snapshotFromState(state: BonsaiVisualState): AnimatedSnapshot {
    return {
        trunkHeight: state.trunkHeight,
        trunkThickness: state.trunkThickness,
        leaves: state.leaves,
        flowers: state.flowers,
        potColor: state.potColor,
        leafColor: state.leafColor,
        flowerColor: state.flowerColor,
        branchLengths: state.branches.map((b) => b.length),
    };
}

function isCloseEnough(a: number, b: number): boolean {
    return Math.abs(a - b) < EPSILON;
}

type AnimState = {
    trunkHeight: number;
    trunkThickness: number;
    leaves: number;
    flowers: number;
    potColor: THREE.Color;
    leafColor: THREE.Color;
    flowerColor: THREE.Color;
    branchLengths: number[];
};

function createAnimState(s: AnimatedSnapshot): AnimState {
    return {
        trunkHeight: s.trunkHeight,
        trunkThickness: s.trunkThickness,
        leaves: s.leaves,
        flowers: s.flowers,
        potColor: new THREE.Color(s.potColor),
        leafColor: new THREE.Color(s.leafColor),
        flowerColor: new THREE.Color(s.flowerColor),
        branchLengths: [...s.branchLengths],
    };
}

export const Bonsai = memo(function Bonsai({ visualState, previousVisualState }: BonsaiProps) {
    const initialSnapshot = useMemo(
        () => snapshotFromState(previousVisualState ?? visualState),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
    const [snapshot, setSnapshot] = useState<AnimatedSnapshot>(initialSnapshot);
    const animRef = useRef<AnimState>(createAnimState(initialSnapshot));

    // パーティクル: previous → current で枝数が増えた場合にトリガー
    const showParticles = useMemo(() => {
        if (!previousVisualState) return false;
        return visualState.branches.length > previousVisualState.branches.length;
    }, [visualState, previousVisualState]);

    const flushSnapshot = useCallback((anim: AnimState) => {
        setSnapshot({
            trunkHeight: anim.trunkHeight,
            trunkThickness: anim.trunkThickness,
            leaves: anim.leaves,
            flowers: anim.flowers,
            potColor: `#${anim.potColor.getHexString()}`,
            leafColor: `#${anim.leafColor.getHexString()}`,
            flowerColor: `#${anim.flowerColor.getHexString()}`,
            branchLengths: [...anim.branchLengths],
        });
    }, []);

    // useFrame は常に最新の visualState prop を参照できる
    useFrame((_, delta) => {
        const anim = animRef.current;
        const target = visualState;
        const t = 1 - Math.exp(-LERP_SPEED * delta);

        const prevH = anim.trunkHeight;
        anim.trunkHeight = THREE.MathUtils.lerp(anim.trunkHeight, target.trunkHeight, t);
        anim.trunkThickness = THREE.MathUtils.lerp(anim.trunkThickness, target.trunkThickness, t);
        anim.leaves = THREE.MathUtils.lerp(anim.leaves, target.leaves, t);
        anim.flowers = THREE.MathUtils.lerp(anim.flowers, target.flowers, t);
        anim.potColor.lerp(new THREE.Color(target.potColor), t);
        anim.leafColor.lerp(new THREE.Color(target.leafColor), t);
        anim.flowerColor.lerp(new THREE.Color(target.flowerColor), t);

        const targetLengths = target.branches.map((b) => b.length);
        while (anim.branchLengths.length < targetLengths.length) {
            anim.branchLengths.push(0);
        }
        for (let i = 0; i < targetLengths.length; i++) {
            anim.branchLengths[i] = THREE.MathUtils.lerp(
                anim.branchLengths[i],
                targetLengths[i],
                t,
            );
        }

        // 変化がある場合のみ React state を更新
        const changed = !isCloseEnough(prevH, anim.trunkHeight) ||
            !isCloseEnough(anim.trunkHeight, target.trunkHeight) ||
            !isCloseEnough(anim.trunkThickness, target.trunkThickness) ||
            !isCloseEnough(anim.leaves, target.leaves) ||
            !isCloseEnough(anim.flowers, target.flowers) ||
            targetLengths.some((tl, i) => !isCloseEnough(anim.branchLengths[i], tl));

        if (changed) {
            // 収束チェック
            const converged =
                isCloseEnough(anim.trunkHeight, target.trunkHeight) &&
                isCloseEnough(anim.trunkThickness, target.trunkThickness) &&
                isCloseEnough(anim.leaves, target.leaves) &&
                isCloseEnough(anim.flowers, target.flowers) &&
                targetLengths.every((tl, i) => isCloseEnough(anim.branchLengths[i], tl));

            if (converged) {
                anim.trunkHeight = target.trunkHeight;
                anim.trunkThickness = target.trunkThickness;
                anim.leaves = target.leaves;
                anim.flowers = target.flowers;
                anim.potColor.set(target.potColor);
                anim.leafColor.set(target.leafColor);
                anim.flowerColor.set(target.flowerColor);
                anim.branchLengths = targetLengths.slice();
            }
            flushSnapshot(anim);
        }
    });

    const roundedLeaves = Math.round(snapshot.leaves);
    const roundedFlowers = Math.round(snapshot.flowers);
    const branchCount = Math.min(visualState.branches.length, MAX_MAIN_BRANCHES);
    // 葉・花を各主枝に均等配分
    const leavesPerBranch = branchCount > 0 ? Math.ceil(roundedLeaves / branchCount) : 0;
    const flowersPerBranch = branchCount > 0 ? Math.ceil(roundedFlowers / branchCount) : 0;

    return (
        <group>
            <Pot potColor={snapshot.potColor} />
            <Trunk
                height={snapshot.trunkHeight}
                thickness={snapshot.trunkThickness}
                leafCount={Math.round(roundedLeaves * 0.15)}
                flowerCount={Math.round(roundedFlowers * 0.1)}
                leafColor={snapshot.leafColor}
                flowerColor={snapshot.flowerColor}
                showTipBranches={branchCount > 0}
            />
            {visualState.branches.slice(0, MAX_MAIN_BRANCHES).map((branch, i) => (
                <Branch
                    key={i}
                    angle={branch.angle}
                    length={snapshot.branchLengths[i] ?? branch.length}
                    depth={branch.depth}
                    seed={branch.seed}
                    trunkHeight={snapshot.trunkHeight}
                    trunkThickness={snapshot.trunkThickness}
                    index={i}
                    totalBranches={branchCount}
                    leafCount={leavesPerBranch}
                    flowerCount={flowersPerBranch}
                    leafColor={snapshot.leafColor}
                    flowerColor={snapshot.flowerColor}
                />
            ))}
            <GrowthParticles active={showParticles} />
        </group>
    );
});
