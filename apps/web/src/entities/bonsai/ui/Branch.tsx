import { memo, useMemo } from 'react';
import * as THREE from 'three';
import {
    computeBranchTransform,
    computeSubBranches,
    branchLengthScale,
    createBranchGeometry,
    createBranchCurve,
    branchThicknessAt,
} from '../lib/bonsai-geometry';
import type { Branch as BranchType } from '../model/types';
import type { SubBranch as SubBranchData } from '../lib/bonsai-geometry';
import { FoliagePad } from './FoliagePad';

type BranchProps = BranchType & {
    trunkHeight: number;
    trunkThickness?: number;
    index: number;
    totalBranches: number;
    leafCount?: number;
    flowerCount?: number;
    leafColor?: string;
    flowerColor?: string;
};

const BRANCH_COLORS = ['#8b6f4e', '#a08060', '#b89878'];
const MAX_DEPTH = 3;
const DEG_TO_RAD = Math.PI / 180;

// ─── サブブランチ ───

function useAttachTransform(parentLength: number, parentSeed: number, attachT: number) {
    return useMemo(() => {
        const curve = createBranchCurve(parentLength, parentSeed);
        const point = curve.getPointAt(attachT);
        const tangent = curve.getTangentAt(attachT).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, tangent);
        const euler = new THREE.Euler().setFromQuaternion(quat);
        return {
            position: [point.x, point.y, point.z] as [number, number, number],
            rotation: [euler.x, euler.y, euler.z] as [number, number, number],
        };
    }, [parentLength, parentSeed, attachT]);
}

function useTipPosition(length: number, seed: number) {
    return useMemo(() => {
        const curve = createBranchCurve(length, seed);
        // 先端より少し手前 (t=0.75) でパッドを枝に埋め込む
        const tip = curve.getPointAt(0.75);
        return [tip.x, tip.y, tip.z] as [number, number, number];
    }, [length, seed]);
}

function SubBranch({
    sub,
    parentLength,
    parentBaseThickness,
    parentSeed,
    leafCount,
    flowerCount,
    leafColor,
    flowerColor,
    parentWorldQuat,
}: {
    sub: SubBranchData;
    parentLength: number;
    parentBaseThickness: number;
    parentSeed: number;
    leafCount: number;
    flowerCount: number;
    leafColor: string;
    flowerColor: string;
    /** 親の累積ワールド回転 (Quaternion) */
    parentWorldQuat: THREE.Quaternion;
}) {
    const parentThicknessAtPoint = branchThicknessAt(parentBaseThickness, sub.attachT);
    const thickness = parentThicknessAtPoint * 0.7;
    const color = BRANCH_COLORS[Math.min(sub.depth - 1, BRANCH_COLORS.length - 1)];

    const attach = useAttachTransform(parentLength, parentSeed, sub.attachT);
    const tipPos = useTipPosition(sub.length, sub.seed);

    const geometry = useMemo(
        () => createBranchGeometry(sub.length, thickness, sub.seed),
        [sub.length, thickness, sub.seed],
    );

    const children = useMemo(
        () => computeSubBranches(sub.length, sub.depth, sub.seed),
        [sub.length, sub.depth, sub.seed],
    );

    const isTerminal = sub.depth >= MAX_DEPTH || children.length === 0;
    const branchRad = sub.angle * DEG_TO_RAD;

    // この SubBranch の累積ワールド回転を計算
    const worldQuat = useMemo(() => {
        const q1 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(attach.rotation[0], attach.rotation[1], attach.rotation[2]),
        );
        const q2 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, sub.yRotation, branchRad),
        );
        return parentWorldQuat.clone().multiply(q1).multiply(q2);
    }, [attach.rotation, sub.yRotation, branchRad, parentWorldQuat]);

    // パッド用: 累積回転の逆
    const counterRotation = useMemo(() => {
        const inv = worldQuat.clone().invert();
        const e = new THREE.Euler().setFromQuaternion(inv);
        return [e.x, e.y, e.z] as [number, number, number];
    }, [worldQuat]);

    return (
        <group position={attach.position} rotation={attach.rotation}>
            <group rotation={[0, sub.yRotation, branchRad]}>
                <mesh geometry={geometry}>
                    <meshStandardMaterial color={color} roughness={0.9} />
                </mesh>

                {isTerminal && (leafCount > 0 || flowerCount > 0) && (
                    <group position={tipPos}>
                        <FoliagePad
                            leafCount={leafCount}
                            flowerCount={flowerCount}
                            leafColor={leafColor}
                            flowerColor={flowerColor}
                            seed={sub.seed + 20000}
                            padRadius={Math.min(0.25, sub.length * 0.4)}
                            counterRotation={counterRotation}
                        />
                    </group>
                )}

                {children.map((child, i) => (
                    <SubBranch
                        key={i}
                        sub={child}
                        parentLength={sub.length}
                        parentBaseThickness={thickness}
                        parentSeed={sub.seed}
                        leafCount={leafCount}
                        flowerCount={flowerCount}
                        leafColor={leafColor}
                        flowerColor={flowerColor}
                        parentWorldQuat={worldQuat}
                    />
                ))}
            </group>
        </group>
    );
}

// ─── 主枝 ───

export const Branch = memo(function Branch({
    angle,
    length,
    depth,
    seed,
    trunkHeight,
    trunkThickness,
    index,
    totalBranches,
    leafCount = 0,
    flowerCount = 0,
    leafColor = '#228B22',
    flowerColor = '#FFB7C5',
}: BranchProps) {
    const branch = useMemo(() => ({ angle, length, depth, seed }), [angle, length, depth, seed]);

    const transform = useMemo(
        () => computeBranchTransform(branch, trunkHeight, index, totalBranches, trunkThickness),
        [branch, trunkHeight, index, totalBranches, trunkThickness],
    );

    const scale = branchLengthScale(index, totalBranches);
    const scaledLength = length * scale;
    const color = BRANCH_COLORS[Math.min(depth - 1, BRANCH_COLORS.length - 1)];

    const geometry = useMemo(
        () => createBranchGeometry(scaledLength, transform.thickness, seed),
        [scaledLength, transform.thickness, seed],
    );

    const subBranches = useMemo(
        () => computeSubBranches(scaledLength, depth, seed),
        [scaledLength, depth, seed],
    );

    const tipPos = useTipPosition(scaledLength, seed);

    // この主枝のワールド回転
    const worldQuat = useMemo(() => {
        return new THREE.Quaternion().setFromEuler(
            new THREE.Euler(transform.rotation[0], transform.rotation[1], transform.rotation[2]),
        );
    }, [transform.rotation]);

    // パッド用: 累積回転の逆
    const counterRotation = useMemo(() => {
        const inv = worldQuat.clone().invert();
        const e = new THREE.Euler().setFromQuaternion(inv);
        return [e.x, e.y, e.z] as [number, number, number];
    }, [worldQuat]);

    // 主枝先端に 40%、サブに 60%
    const mainTipLeaves = Math.ceil(leafCount * 0.4);
    const mainTipFlowers = Math.ceil(flowerCount * 0.4);
    const subLeaves = leafCount - mainTipLeaves;
    const subFlowers = flowerCount - mainTipFlowers;
    const subTipCount = Math.max(subBranches.length, 1);
    const leavesPerTip = Math.ceil(subLeaves / subTipCount);
    const flowersPerTip = Math.ceil(subFlowers / subTipCount);

    return (
        <group position={transform.position} rotation={transform.rotation}>
            <mesh geometry={geometry}>
                <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>

            {/* 主枝先端の大きなパッド */}
            <group position={tipPos}>
                <FoliagePad
                    leafCount={mainTipLeaves}
                    flowerCount={mainTipFlowers}
                    leafColor={leafColor}
                    flowerColor={flowerColor}
                    seed={seed + 20000}
                    padRadius={Math.min(0.35, scaledLength * 0.25)}
                    counterRotation={counterRotation}
                />
            </group>

            {subBranches.map((sub, i) => (
                <SubBranch
                    key={i}
                    sub={sub}
                    parentLength={scaledLength}
                    parentBaseThickness={transform.thickness}
                    parentSeed={seed}
                    leafCount={leavesPerTip}
                    flowerCount={flowersPerTip}
                    leafColor={leafColor}
                    flowerColor={flowerColor}
                    parentWorldQuat={worldQuat}
                />
            ))}
        </group>
    );
});
