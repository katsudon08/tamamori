'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { BonsaiVisualState } from '../model/types';
import { Bonsai } from './Bonsai';

type BonsaiSceneProps = {
    visualState: BonsaiVisualState;
    previousVisualState?: BonsaiVisualState;
    className?: string;
};

export function BonsaiScene({ visualState, previousVisualState, className }: BonsaiSceneProps) {
    return (
        <Canvas
            className={className}
            camera={{ position: [0, 1.5, 4], fov: 45 }}
            dpr={[1, 2]}
        >
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <Bonsai visualState={visualState} previousVisualState={previousVisualState} />
            <OrbitControls
                enablePan={false}
                minDistance={2}
                maxDistance={8}
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI / 2.2}
                target={[0, 0.8, 0]}
            />
        </Canvas>
    );
}
