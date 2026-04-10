'use client';

import { memo, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import {
    computeBranchTransform,
    computeSubBranches,
    branchLengthScale,
    createBranchGeometry,
    createBranchCurve,
    branchThicknessAt,
    seededRandom,
} from '../lib/bonsai-geometry';
import type { Branch as BranchType } from '../model/types';
import type { SubBranch as SubBranchData } from '../lib/bonsai-geometry';

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

// 扁平楕円体ジオメトリ (パッド構成要素)
const leafGeo = new THREE.SphereGeometry(0.16, 6, 4);
const flowerGeo = new THREE.SphereGeometry(0.09, 6, 4);
const dummyObj = new THREE.Object3D();
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// ─── 盆栽パッド: 葉と花を統合した雲型クラスター ───

/**
 * 盆栽の枝葉パッド
 *
 * - パッド法線は常にほぼ上向き (盆栽の葉は水平に広がる)
 * - 葉を明/中/暗の3層に分けて色のグラデーションを出す
 * - 花は葉パッドの表面に散らす
 */
function FoliagePad({
    leafCount,
    flowerCount,
    leafColor,
    flowerColor,
    seed,
    padRadius,
    counterRotation,
}: {
    leafCount: number;
    flowerCount: number;
    leafColor: string;
    flowerColor: string;
    seed: number;
    padRadius: number;
    /** 親 group の累積回転を打ち消して、パッドをワールド水平に保つ */
    counterRotation?: [number, number, number];
}) {
    const leafDarkRef = useRef<THREE.InstancedMesh>(null);
    const leafMidRef = useRef<THREE.InstancedMesh>(null);
    const leafLightRef = useRef<THREE.InstancedMesh>(null);
    const flowerRef = useRef<THREE.InstancedMesh>(null);

    // 色のバリエーション
    const colors = useMemo(() => {
        const base = new THREE.Color(leafColor);
        const dark = base.clone().offsetHSL(0, 0.05, -0.08);
        const light = base.clone().offsetHSL(0.02, -0.05, 0.1);
        return {
            dark: `#${dark.getHexString()}`,
            mid: leafColor,
            light: `#${light.getHexString()}`,
        };
    }, [leafColor]);

    // 3層に分割
    const layerCounts = useMemo(() => {
        const dark = Math.floor(leafCount * 0.3);
        const light = Math.floor(leafCount * 0.25);
        const mid = leafCount - dark - light;
        return { dark, mid, light };
    }, [leafCount]);

    useEffect(() => {
        const rng = seededRandom(seed + 11111);

        // パッドはワールド水平面 (XZ) に広がる
        const up = new THREE.Vector3(0, 1, 0);

        const placeLeafLayer = (
            meshRef: React.RefObject<THREE.InstancedMesh | null>,
            count: number,
            startIdx: number,
            yOffset: number,
        ) => {
            if (!meshRef.current || count === 0) return;
            for (let i = 0; i < count; i++) {
                const gi = startIdx + i;
                const theta = gi * GOLDEN_ANGLE;
                const frac = (gi + 0.5) / leafCount;
                const r = padRadius * Math.sqrt(frac);

                // ワールド XZ 平面上にディスク配置
                const px = r * Math.cos(theta);
                const pz = r * Math.sin(theta);

                // ドーム: 中心ほどY方向に膨らむ
                const dome = (1 - frac) * padRadius * 0.7;

                dummyObj.position.set(px, dome + yOffset, pz);

                // 向き: ほぼ上向き + 微小揺らぎ
                const normal = up.clone();
                normal.x += (rng() - 0.5) * 0.08;
                normal.z += (rng() - 0.5) * 0.08;
                normal.normalize();
                dummyObj.quaternion.setFromUnitVectors(up, normal);

                const baseScale = (1.5 - frac * 0.6) * (0.85 + rng() * 0.3);
                dummyObj.scale.set(baseScale, baseScale * 0.55, baseScale);

                dummyObj.updateMatrix();
                meshRef.current.setMatrixAt(i, dummyObj.matrix);
            }
            meshRef.current.instanceMatrix.needsUpdate = true;
        };

        const layerGap = padRadius * 0.22;
        placeLeafLayer(leafDarkRef, layerCounts.dark, 0, -layerGap);
        placeLeafLayer(leafMidRef, layerCounts.mid, layerCounts.dark, 0);
        placeLeafLayer(leafLightRef, layerCounts.light, layerCounts.dark + layerCounts.mid, layerGap);

        // 花もワールド XZ 水平面に配置
        if (flowerRef.current && flowerCount > 0) {
            for (let i = 0; i < flowerCount; i++) {
                const theta = (i * GOLDEN_ANGLE * 1.3) + rng() * 0.5;
                const frac = (i + 0.5) / flowerCount;
                const r = padRadius * 0.8 * Math.sqrt(frac);

                const px = r * Math.cos(theta);
                const pz = r * Math.sin(theta);

                const dome = (1 - frac) * padRadius * 0.7;
                const lift = dome + layerGap + padRadius * 0.05;

                dummyObj.position.set(px, lift, pz);

                const normal = up.clone();
                normal.x += (rng() - 0.5) * 0.15;
                normal.z += (rng() - 0.5) * 0.15;
                normal.normalize();
                dummyObj.quaternion.setFromUnitVectors(up, normal);

                const s = (1.0 - frac * 0.3) * (0.7 + rng() * 0.5);
                dummyObj.scale.set(s, s * 0.4, s);

                dummyObj.updateMatrix();
                flowerRef.current.setMatrixAt(i, dummyObj.matrix);
            }
            flowerRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [leafCount, flowerCount, seed, padRadius, layerCounts]);

    // counterRotation に seed ベースのランダムな傾きを加える (上向きの強弱)
    const tiltedRotation = useMemo(() => {
        const rng = seededRandom(seed + 55555);
        const tiltX = (rng() - 0.5) * 0.5; // ±14°
        const tiltZ = (rng() - 0.5) * 0.5;
        if (!counterRotation) return [tiltX, 0, tiltZ] as [number, number, number];
        // counterRotation にランダム傾きを加算
        const base = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(counterRotation[0], counterRotation[1], counterRotation[2]),
        );
        const tilt = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(tiltX, 0, tiltZ),
        );
        base.multiply(tilt);
        const e = new THREE.Euler().setFromQuaternion(base);
        return [e.x, e.y, e.z] as [number, number, number];
    }, [counterRotation, seed]);

    return (
        <group rotation={tiltedRotation}>
            {layerCounts.dark > 0 && (
                <instancedMesh ref={leafDarkRef} args={[leafGeo, undefined, layerCounts.dark]}>
                    <meshStandardMaterial color={colors.dark} roughness={0.75} />
                </instancedMesh>
            )}
            {layerCounts.mid > 0 && (
                <instancedMesh ref={leafMidRef} args={[leafGeo, undefined, layerCounts.mid]}>
                    <meshStandardMaterial color={colors.mid} roughness={0.7} />
                </instancedMesh>
            )}
            {layerCounts.light > 0 && (
                <instancedMesh ref={leafLightRef} args={[leafGeo, undefined, layerCounts.light]}>
                    <meshStandardMaterial color={colors.light} roughness={0.65} />
                </instancedMesh>
            )}
            {flowerCount > 0 && (
                <instancedMesh ref={flowerRef} args={[flowerGeo, undefined, flowerCount]}>
                    <meshStandardMaterial
                        color={flowerColor}
                        roughness={0.4}
                        emissive={flowerColor}
                        emissiveIntensity={0.15}
                    />
                </instancedMesh>
            )}
        </group>
    );
}

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
    sub, parentLength, parentBaseThickness, parentSeed,
    leafCount, flowerCount, leafColor, flowerColor,
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
                            padRadius={0.25}
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
    angle, length, depth, seed,
    trunkHeight, trunkThickness, index, totalBranches,
    leafCount = 0, flowerCount = 0,
    leafColor = '#228B22', flowerColor = '#FFB7C5',
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
                    padRadius={0.35}
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
