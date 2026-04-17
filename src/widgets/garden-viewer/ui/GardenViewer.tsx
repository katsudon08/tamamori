'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

import { GardenBonsaiLabel } from './GardenBonsaiLabel';
import {
    computeCameraPosition,
    computeGridPositions,
    GARDEN_BONSAI_SCALE,
    GARDEN_CAMERA_FOV,
} from '../lib/garden-layout';

import type { Bonsai } from '@/entities/bonsai';
import { Bonsai3D } from '@/entities/bonsai';
import { ErrorBoundary, ErrorFallback } from '@/shared/ui';

export type GardenBonsaiItem = Bonsai & {
    users: { display_name: string; avatar_url: string | null };
};

type GardenViewerProps = {
    bonsaiList: GardenBonsaiItem[];
    className?: string;
};

const LABEL_PADDING = 0.15;
const LABEL_CAMERA_OFFSET = 0.5;

/** 盆栽1つ分のスロット。バウンディングボックスからラベル位置を自動算出 */
function GardenBonsaiSlot({ item }: { item: GardenBonsaiItem }) {
    const groupRef = useRef<THREE.Group>(null);
    const labelGroupRef = useRef<THREE.Group>(null);
    const parentWorldPos = useRef(new THREE.Vector3());
    const [labelY, setLabelY] = useState<number | null>(null);

    useLayoutEffect(() => {
        if (!groupRef.current) return;
        const box = new THREE.Box3().setFromObject(groupRef.current);
        setLabelY(box.min.y - LABEL_PADDING);
    }, [item.visual_state]);

    // ラベルを常にカメラ側に突き出す
    useFrame(({ camera }) => {
        if (!labelGroupRef.current) return;
        labelGroupRef.current.parent?.getWorldPosition(parentWorldPos.current);
        const dx = camera.position.x - parentWorldPos.current.x;
        const dz = camera.position.z - parentWorldPos.current.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) {
            labelGroupRef.current.position.x = (dx / len) * LABEL_CAMERA_OFFSET;
            labelGroupRef.current.position.z = (dz / len) * LABEL_CAMERA_OFFSET;
        }
    });

    return (
        <>
            <group ref={groupRef} scale={GARDEN_BONSAI_SCALE}>
                <Bonsai3D visualState={item.visual_state} />
            </group>
            {labelY !== null && (
                <group ref={labelGroupRef}>
                    <GardenBonsaiLabel
                        userId={item.user_id}
                        displayName={item.users.display_name}
                        avatarUrl={item.users.avatar_url}
                        position={[0, labelY, 0]}
                    />
                </group>
            )}
        </>
    );
}

export function GardenViewer({ bonsaiList, className }: GardenViewerProps) {
    const positions = computeGridPositions(bonsaiList.length);
    const cameraPosition = computeCameraPosition(bonsaiList.length);

    return (
        <div className={`h-full w-full ${className ?? ''}`}>
            <ErrorBoundary
                fallbackRender={({ reset }) => (
                    <ErrorFallback
                        title="3D描画エラー"
                        message="WebGLの描画に失敗しました。ブラウザを再読み込みしてください。"
                        onRetry={reset}
                    />
                )}
            >
                <Canvas camera={{ position: cameraPosition, fov: GARDEN_CAMERA_FOV }} dpr={[1, 2]}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 5, 5]} intensity={0.8} />
                    {bonsaiList.map((item, i) => (
                        <group key={item.id} position={positions[i]}>
                            <GardenBonsaiSlot item={item} />
                        </group>
                    ))}
                    <OrbitControls
                        enablePan
                        minDistance={5}
                        maxDistance={25}
                        minPolarAngle={Math.PI / 6}
                        maxPolarAngle={Math.PI / 2.5}
                        makeDefault
                    />
                </Canvas>
            </ErrorBoundary>
        </div>
    );
}
