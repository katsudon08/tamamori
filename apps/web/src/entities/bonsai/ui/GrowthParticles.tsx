import { memo, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type GrowthParticlesProps = {
    active: boolean;
};

const PARTICLE_COUNT = 60;
const LIFETIME = 2.0;

export const GrowthParticles = memo(function GrowthParticles({ active }: GrowthParticlesProps) {
    const pointsRef = useRef<THREE.Points>(null);
    const timeRef = useRef(0);
    const isPlayingRef = useRef(false);
    const prevActiveRef = useRef(false);
    const velocitiesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));

    const initParticles = useCallback(() => {
        if (!pointsRef.current) return;
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
        const velocities = velocitiesRef.current;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 0.5;
            positions[i3 + 1] = 0.5 + Math.random() * 1.0;
            positions[i3 + 2] = (Math.random() - 0.5) * 0.5;
            velocities[i3] = (Math.random() - 0.5) * 0.3;
            velocities[i3 + 1] = 0.3 + Math.random() * 0.5;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }, []);

    useFrame((_, delta) => {
        // active の立ち上がりエッジでパーティクル初期化
        if (active && !prevActiveRef.current) {
            isPlayingRef.current = true;
            timeRef.current = 0;
            initParticles();
        }
        prevActiveRef.current = active;

        if (!isPlayingRef.current || !pointsRef.current) return;

        timeRef.current += delta;
        if (timeRef.current > LIFETIME) {
            isPlayingRef.current = false;
            pointsRef.current.visible = false;
            return;
        }

        pointsRef.current.visible = true;
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
        const velocities = velocitiesRef.current;
        const progress = timeRef.current / LIFETIME;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            positions[i3] += velocities[i3] * delta;
            positions[i3 + 1] += velocities[i3 + 1] * delta;
            positions[i3 + 2] += velocities[i3 + 2] * delta;
            velocities[i3] *= 0.98;
            velocities[i3 + 1] *= 0.98;
            velocities[i3 + 2] *= 0.98;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;

        const material = pointsRef.current.material as THREE.PointsMaterial;
        material.opacity = 1 - progress;
    });

    return (
        <points ref={pointsRef} visible={false}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[new Float32Array(PARTICLE_COUNT * 3), 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                color="#ffd700"
                size={0.04}
                transparent
                opacity={1}
                sizeAttenuation
                depthWrite={false}
            />
        </points>
    );
});
