'use client';

import { memo, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { seededRandom } from '../lib/bonsai-geometry';

type FoliagePadProps = {
    leafCount: number;
    flowerCount: number;
    leafColor: string;
    flowerColor: string;
    seed: number;
    padRadius: number;
    /** 親 group の累積回転を打ち消して、パッドをワールド水平に保つ */
    counterRotation?: [number, number, number];
};

// 扁平楕円体ジオメトリ (パッド構成要素)
const leafGeo = new THREE.SphereGeometry(0.16, 6, 4);
const flowerGeo = new THREE.SphereGeometry(0.09, 6, 4);
const dummyObj = new THREE.Object3D();
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * 盆栽の枝葉パッド
 *
 * - パッド法線は常にほぼ上向き (盆栽の葉は水平に広がる)
 * - 葉を明/中/暗の3層に分けて色のグラデーションを出す
 * - 花は葉パッドの表面に散らす
 */
export const FoliagePad = memo(function FoliagePad({
    leafCount,
    flowerCount,
    leafColor,
    flowerColor,
    seed,
    padRadius,
    counterRotation,
}: FoliagePadProps) {
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
});
