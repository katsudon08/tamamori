'use client';

import { memo } from 'react';

type PotProps = {
    potColor: string;
};

export const Pot = memo(function Pot({ potColor }: PotProps) {
    return (
        <group position={[0, -0.15, 0]}>
            {/* 鉢本体 */}
            <mesh>
                <cylinderGeometry args={[0.35, 0.4, 0.25, 16]} />
                <meshStandardMaterial color={potColor} roughness={0.8} metalness={0.1} />
            </mesh>
            {/* 鉢の縁 */}
            <mesh position={[0, 0.13, 0]}>
                <cylinderGeometry args={[0.38, 0.38, 0.04, 16]} />
                <meshStandardMaterial color={potColor} roughness={0.7} metalness={0.1} />
            </mesh>
        </group>
    );
});
