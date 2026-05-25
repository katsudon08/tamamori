import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Decorator } from '@storybook/nextjs-vite';

export const R3FDecorator: Decorator = (Story) => (
    <Canvas
        camera={{ position: [0, 1.5, 4], fov: 45 }}
        style={{ height: 500, background: '#f5f0eb' }}
    >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Story />
        <OrbitControls target={[0, 0.8, 0]} />
    </Canvas>
);
