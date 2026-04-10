'use client';

import { memo, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { computeLeafPositions } from '../lib/bonsai-geometry';
import type { Branch } from '../model/types';

type LeavesProps = {
    count: number;
    color: string;
    branches: Branch[];
    trunkHeight: number;
};

const dummy = new THREE.Object3D();
const leafGeometry = new THREE.SphereGeometry(0.10, 5, 5);

export const Leaves = memo(function Leaves({ count, color, branches, trunkHeight }: LeavesProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const positions = useMemo(
        () => computeLeafPositions(count, branches, trunkHeight),
        [count, branches, trunkHeight],
    );

    useEffect(() => {
        if (!meshRef.current || positions.length === 0) return;

        // クラスター中心 = 全位置の重心
        let cx = 0, cy = 0, cz = 0;
        for (const [x, y, z] of positions) { cx += x; cy += y; cz += z; }
        cx /= positions.length; cy /= positions.length; cz /= positions.length;

        // 最大距離を計算 (スケール勾配用)
        let maxDist = 0;
        for (const [x, y, z] of positions) {
            const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2);
            if (d > maxDist) maxDist = d;
        }
        if (maxDist < 0.001) maxDist = 1;

        const outDir = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i < positions.length; i++) {
            const [x, y, z] = positions[i];
            dummy.position.set(x, y, z);

            // 重心から外側を向く
            outDir.set(x - cx, y - cy, z - cz);
            if (outDir.lengthSq() < 0.0001) outDir.set(0, 1, 0);
            outDir.normalize();
            outDir.y += 0.3;
            outDir.normalize();
            outDir.x += (Math.random() - 0.5) * 0.2;
            outDir.z += (Math.random() - 0.5) * 0.2;
            outDir.normalize();

            dummy.quaternion.setFromUnitVectors(up, outDir);

            // 中心ほど大きく、外側ほど小さい
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2);
            const t = dist / maxDist; // 0=中心, 1=外周
            const baseScale = 1.3 - t * 0.8; // 中心1.3, 外周0.5
            dummy.scale.setScalar(baseScale * (0.85 + Math.random() * 0.3));
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [positions]);

    if (count === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[leafGeometry, undefined, count]}>
            <meshStandardMaterial color={color} roughness={0.7} />
        </instancedMesh>
    );
});
