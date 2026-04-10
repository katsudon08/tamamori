'use client';

import { memo, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import {
    createTrunkCurve,
    createBranchGeometry,
    createBranchCurve,
    seededRandom,
} from '../lib/bonsai-geometry';

type TrunkProps = {
    height: number;
    thickness: number;
    leafCount?: number;
    flowerCount?: number;
    leafColor?: string;
    flowerColor?: string;
    /** Branching Stage 以降で true → 幹先端に中枝を生やす */
    showTipBranches?: boolean;
};

const TRUNK_COLOR = '#8b6f4e';
const TUBE_SEGMENTS = 32;
const RADIAL_SEGMENTS = 10;

// パッド構成要素
const leafGeo = new THREE.SphereGeometry(0.16, 6, 4);
const flowerGeo = new THREE.SphereGeometry(0.09, 6, 4);
const dummyObj = new THREE.Object3D();
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** 幹先端の FoliagePad (Branch.tsx と同じパッド構造) */
function TrunkFoliagePad({
    leafCount,
    flowerCount,
    leafColor,
    flowerColor,
    seed,
    direction,
    counterRotation,
}: {
    leafCount: number;
    flowerCount: number;
    leafColor: string;
    flowerColor: string;
    seed: number;
    direction: THREE.Vector3;
    counterRotation?: [number, number, number];
}) {
    const leafRef = useRef<THREE.InstancedMesh>(null);
    const flowerRef = useRef<THREE.InstancedMesh>(null);

    useEffect(() => {
        const rng = seededRandom(seed);
        const dir = direction.clone().normalize();
        const ref = Math.abs(dir.y) < 0.99
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(1, 0, 0);
        const perp1 = new THREE.Vector3().crossVectors(dir, ref).normalize();
        const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();
        const padNormal = new THREE.Vector3(dir.x * 0.2, 1, dir.z * 0.2).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const padRadius = 0.28;

        if (leafRef.current && leafCount > 0) {
            for (let i = 0; i < leafCount; i++) {
                const theta = i * GOLDEN_ANGLE;
                const frac = (i + 0.5) / leafCount;
                const r = padRadius * Math.sqrt(frac);
                const lx = perp1.x * r * Math.cos(theta) + perp2.x * r * Math.sin(theta);
                const ly = perp1.y * r * Math.cos(theta) + perp2.y * r * Math.sin(theta);
                const lz = perp1.z * r * Math.cos(theta) + perp2.z * r * Math.sin(theta);
                const dome = (1 - frac) * padRadius * 0.7;
                dummyObj.position.set(
                    lx + padNormal.x * dome,
                    ly + padNormal.y * dome,
                    lz + padNormal.z * dome,
                );
                const normal = padNormal.clone();
                normal.x += (rng() - 0.5) * 0.1;
                normal.z += (rng() - 0.5) * 0.1;
                normal.normalize();
                dummyObj.quaternion.setFromUnitVectors(up, normal);
                const s = (1.5 - frac * 0.6) * (0.85 + rng() * 0.3);
                dummyObj.scale.set(s, s * 0.55, s);
                dummyObj.updateMatrix();
                leafRef.current.setMatrixAt(i, dummyObj.matrix);
            }
            leafRef.current.instanceMatrix.needsUpdate = true;
        }

        if (flowerRef.current && flowerCount > 0) {
            for (let i = 0; i < flowerCount; i++) {
                const theta = (i * GOLDEN_ANGLE * 1.3) + rng() * 0.5;
                const frac = (i + 0.5) / flowerCount;
                const r = padRadius * 0.85 * Math.sqrt(frac);
                const lx = perp1.x * r * Math.cos(theta) + perp2.x * r * Math.sin(theta);
                const ly = perp1.y * r * Math.cos(theta) + perp2.y * r * Math.sin(theta);
                const lz = perp1.z * r * Math.cos(theta) + perp2.z * r * Math.sin(theta);
                const dome = (1 - frac) * padRadius * 0.7;
                const lift = dome + padRadius * 0.15;
                dummyObj.position.set(
                    lx + padNormal.x * lift,
                    ly + padNormal.y * lift,
                    lz + padNormal.z * lift,
                );
                const normal = padNormal.clone();
                normal.x += (rng() - 0.5) * 0.2;
                normal.z += (rng() - 0.5) * 0.2;
                normal.normalize();
                dummyObj.quaternion.setFromUnitVectors(up, normal);
                const s = (1.0 - frac * 0.3) * (0.7 + rng() * 0.5);
                dummyObj.scale.set(s, s * 0.55, s);
                dummyObj.updateMatrix();
                flowerRef.current.setMatrixAt(i, dummyObj.matrix);
            }
            flowerRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [leafCount, flowerCount, seed, direction]);

    return (
        <group rotation={counterRotation}>
            {leafCount > 0 && (
                <instancedMesh ref={leafRef} args={[leafGeo, undefined, leafCount]}>
                    <meshStandardMaterial color={leafColor} roughness={0.7} />
                </instancedMesh>
            )}
            {flowerCount > 0 && (
                <instancedMesh ref={flowerRef} args={[flowerGeo, undefined, flowerCount]}>
                    <meshStandardMaterial color={flowerColor} roughness={0.4} emissive={flowerColor} emissiveIntensity={0.15} />
                </instancedMesh>
            )}
        </group>
    );
}

function createTrunkGeometry(height: number, thickness: number): THREE.BufferGeometry {
    if (height <= 0) return new THREE.BufferGeometry();

    const curve = createTrunkCurve(height);
    const tube = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, 1, RADIAL_SEGMENTS, false);
    const pos = tube.attributes.position;
    const stride = RADIAL_SEGMENTS + 1;

    for (let i = 0; i <= TUBE_SEGMENTS; i++) {
        const t = i / TUBE_SEGMENTS;
        const center = curve.getPointAt(t);
        const tipRadius = thickness * 0.01;
        const smooth = t * t * (3 - 2 * t);
        const radius = thickness + (tipRadius - thickness) * smooth;
        for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
            const idx = i * stride + j;
            const ox = pos.getX(idx) - center.x;
            const oy = pos.getY(idx) - center.y;
            const oz = pos.getZ(idx) - center.z;
            pos.setXYZ(idx, center.x + ox * radius, center.y + oy * radius, center.z + oz * radius);
        }
    }

    const tipPoint = curve.getPointAt(1);
    for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
        pos.setXYZ(TUBE_SEGMENTS * stride + j, tipPoint.x, tipPoint.y, tipPoint.z);
    }

    pos.needsUpdate = true;
    tube.computeVertexNormals();

    const verts = Array.from(pos.array);
    const norms = Array.from(tube.attributes.normal.array);
    const uvArr = Array.from(tube.attributes.uv.array);
    const idxArr = Array.from(tube.index!.array);

    const centerIdx = verts.length / 3;
    let avgX = 0, avgY = 0, avgZ = 0;
    for (let j = 0; j < RADIAL_SEGMENTS; j++) {
        avgX += verts[j * 3]; avgY += verts[j * 3 + 1]; avgZ += verts[j * 3 + 2];
    }
    avgX /= RADIAL_SEGMENTS; avgY /= RADIAL_SEGMENTS; avgZ /= RADIAL_SEGMENTS;
    verts.push(avgX, avgY, avgZ);
    norms.push(0, -1, 0);
    uvArr.push(0.5, 0.5);
    for (let j = 0; j < RADIAL_SEGMENTS; j++) {
        idxArr.push(centerIdx, (j + 1) % RADIAL_SEGMENTS, j);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    geo.setIndex(idxArr);
    return geo;
}

const BRANCH_COLOR = '#a08060';
const DEG_TO_RAD = Math.PI / 180;
/** 幹上の分岐位置 (先端より手前) */
const TIP_BRANCH_T = 0.8;

type TipBranchTransform = {
    position: [number, number, number];
    rotation: [number, number, number];
    length: number;
    seed: number;
};

/**
 * 幹の t=0.8 地点から生える中枝の配置を計算する
 * 幹の Frenet フレームから正しい方向に生やし、表面に配置
 */
function useTipBranchTransform(height: number, thickness: number): TipBranchTransform | null {
    return useMemo(() => {
        if (height <= 0) return null;
        const rng = seededRandom(44444);
        const curve = createTrunkCurve(height);
        const TRUNK_SEGMENTS = 32;
        const frames = curve.computeFrenetFrames(TRUNK_SEGMENTS, false);

        const point = curve.getPointAt(TIP_BRANCH_T);
        const segIdx = Math.round(TIP_BRANCH_T * TRUNK_SEGMENTS);
        const N = frames.normals[segIdx];
        const B = frames.binormals[segIdx];
        const T = frames.tangents[segIdx];

        // 放射方向
        const yAngle = rng() * Math.PI * 2;
        const outward = new THREE.Vector3()
            .addScaledVector(N, Math.cos(yAngle))
            .addScaledVector(B, Math.sin(yAngle))
            .normalize();

        // 枝の方向: やや横向き (50〜65°)
        const branchAngle = (50 + rng() * 15) * DEG_TO_RAD;
        const branchDir = new THREE.Vector3()
            .addScaledVector(outward, Math.sin(branchAngle))
            .addScaledVector(T, Math.cos(branchAngle))
            .normalize();

        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, branchDir);
        const euler = new THREE.Euler().setFromQuaternion(quat);

        // 幹表面にオフセット
        const topRadius = thickness * 0.01;
        const smooth = TIP_BRANCH_T * TIP_BRANCH_T * (3 - 2 * TIP_BRANCH_T);
        const trunkR = thickness + (topRadius - thickness) * smooth;

        return {
            position: [
                point.x + outward.x * trunkR * 0.5,
                point.y + outward.y * trunkR * 0.5,
                point.z + outward.z * trunkR * 0.5,
            ],
            rotation: [euler.x, euler.y, euler.z],
            length: height * (0.15 + rng() * 0.05),
            seed: 44000,
        };
    }, [height, thickness]);
}

function TipBranch({
    transform,
    leafCount,
    flowerCount,
    leafColor,
    flowerColor,
}: {
    transform: TipBranchTransform;
    leafCount: number;
    flowerCount: number;
    leafColor: string;
    flowerColor: string;
}) {
    const geo = useMemo(
        () => createBranchGeometry(transform.length, 0.04, transform.seed),
        [transform.length, transform.seed],
    );

    const tipPos = useMemo(() => {
        const curve = createBranchCurve(transform.length, transform.seed);
        const tip = curve.getPointAt(0.85);
        return [tip.x, tip.y, tip.z] as [number, number, number];
    }, [transform.length, transform.seed]);

    // パッド用の逆回転
    const counterRotation = useMemo(() => {
        const q = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(transform.rotation[0], transform.rotation[1], transform.rotation[2]),
        );
        q.invert();
        const e = new THREE.Euler().setFromQuaternion(q);
        return [e.x, e.y, e.z] as [number, number, number];
    }, [transform.rotation]);

    const tiltedRotation = useMemo(() => {
        const rng = seededRandom(transform.seed + 55555);
        const tiltX = (rng() - 0.5) * 0.5;
        const tiltZ = (rng() - 0.5) * 0.5;
        const base = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(counterRotation[0], counterRotation[1], counterRotation[2]),
        );
        const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(tiltX, 0, tiltZ));
        base.multiply(tilt);
        const e = new THREE.Euler().setFromQuaternion(base);
        return [e.x, e.y, e.z] as [number, number, number];
    }, [counterRotation, transform.seed]);

    return (
        <group position={transform.position} rotation={transform.rotation}>
            <mesh geometry={geo}>
                <meshStandardMaterial color={BRANCH_COLOR} roughness={0.9} />
            </mesh>
            <group position={tipPos}>
                <TrunkFoliagePad
                    leafCount={leafCount}
                    flowerCount={flowerCount}
                    leafColor={leafColor}
                    flowerColor={flowerColor}
                    seed={transform.seed + 20000}
                    direction={new THREE.Vector3(0, 1, 0)}
                    counterRotation={tiltedRotation}
                />
            </group>
        </group>
    );
}

export const Trunk = memo(function Trunk({
    height, thickness,
    leafCount = 0, flowerCount = 0,
    leafColor = '#228B22', flowerColor = '#FFB7C5',
    showTipBranches = false,
}: TrunkProps) {
    const geometry = useMemo(() => createTrunkGeometry(height, thickness), [height, thickness]);

    const tipTransform = useMemo(() => {
        if (height <= 0) return null;
        const curve = createTrunkCurve(height);
        return {
            position: [curve.getPointAt(1).x, curve.getPointAt(1).y, curve.getPointAt(1).z] as [number, number, number],
            direction: curve.getTangentAt(1).normalize(),
        };
    }, [height]);

    const tipBranch = useTipBranchTransform(height, thickness);

    // 幹先端 (主枝) パッドに 60%、分岐中枝に 40% を配分
    const mainLeaves = Math.ceil(leafCount * 0.6);
    const mainFlowers = Math.ceil(flowerCount * 0.6);
    const branchLeaves = leafCount - mainLeaves;
    const branchFlowers = flowerCount - mainFlowers;

    return (
        <group>
            <mesh geometry={geometry}>
                <meshStandardMaterial color={TRUNK_COLOR} roughness={0.9} />
            </mesh>
            {tipTransform && (
                <group position={tipTransform.position}>
                    {/* 幹先端のメインパッド */}
                    {(mainLeaves > 0 || mainFlowers > 0) && (
                        <TrunkFoliagePad
                            leafCount={mainLeaves}
                            flowerCount={mainFlowers}
                            leafColor={leafColor}
                            flowerColor={flowerColor}
                            seed={42000}
                            direction={tipTransform.direction}
                        />
                    )}
                </group>
            )}
            {/* 幹の t=0.8 地点から分岐する中枝 (Branching Stage 以降) */}
            {showTipBranches && tipBranch && (
                <TipBranch
                    transform={tipBranch}
                    leafCount={branchLeaves}
                    flowerCount={branchFlowers}
                    leafColor={leafColor}
                    flowerColor={flowerColor}
                />
            )}
        </group>
    );
});
