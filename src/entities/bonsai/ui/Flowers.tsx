'use client';

import { memo, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { computeFlowerPositions } from '../lib/bonsai-geometry';
import type { Branch } from '../model/types';

type FlowersProps = {
    count: number;
    color: string;
    branches: Branch[];
    trunkHeight: number;
};

const dummy = new THREE.Object3D();
const flowerGeometry = new THREE.SphereGeometry(0.12, 6, 6);

export const Flowers = memo(function Flowers({
    count,
    color,
    branches,
    trunkHeight,
}: FlowersProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const positions = useMemo(
        () => computeFlowerPositions(count, branches, trunkHeight),
        [count, branches, trunkHeight],
    );

    useEffect(() => {
        if (!meshRef.current || positions.length === 0) return;

        let cx = 0, cy = 0, cz = 0;
        for (const [x, y, z] of positions) { cx += x; cy += y; cz += z; }
        cx /= positions.length; cy /= positions.length; cz /= positions.length;

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

            outDir.set(x - cx, y - cy, z - cz);
            if (outDir.lengthSq() < 0.0001) outDir.set(0, 1, 0);
            outDir.normalize();
            outDir.y += 0.4;
            outDir.normalize();
            outDir.x += (Math.random() - 0.5) * 0.15;
            outDir.z += (Math.random() - 0.5) * 0.15;
            outDir.normalize();

            dummy.quaternion.setFromUnitVectors(up, outDir);

            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2);
            const t = dist / maxDist;
            const baseScale = 1.2 - t * 0.7; // 中心1.2, 外周0.5
            dummy.scale.setScalar(baseScale * (0.8 + Math.random() * 0.4));
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [positions]);

    if (count === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[flowerGeometry, undefined, count]}>
            <meshStandardMaterial
                color={color}
                roughness={0.5}
                emissive={color}
                emissiveIntensity={0.2}
            />
        </instancedMesh>
    );
});
