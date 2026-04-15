/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';

import { makeGardenBonsai } from '../__stories__/_fixtures';

// --- mocks ---------------------------------------------------------------

jest.mock('@/entities/bonsai', () => ({
    Bonsai3D: () => null,
}));

// R3F の Canvas 内部の children (ambientLight, group 等) は jsdom で不正タグになるため
// children をレンダリングしないモックにする。3D描画の検証は Storybook で行う。
jest.mock('@react-three/fiber', () => ({
    Canvas: () => <div data-testid="r3f-canvas" />,
    useFrame: jest.fn(),
    useThree: jest.fn().mockReturnValue({ camera: { position: { x: 0, y: 8, z: 12 } } }),
}));

jest.mock('@react-three/drei', () => ({
    OrbitControls: () => null,
    Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ alt, ...props }: Record<string, unknown>) => (
        <span role="img" aria-label={alt as string} {...props} />
    ),
}));

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// --- helpers -------------------------------------------------------------

import { GardenViewer } from '../GardenViewer';

const MOCK_DATA = [
    makeGardenBonsai('seed', 0),
    makeGardenBonsai('young', 1),
    makeGardenBonsai('flowering', 2),
];

// --- tests ---------------------------------------------------------------

describe('GardenViewer', () => {
    test('bonsaiList を渡すと Canvas が表示される', () => {
        render(<GardenViewer bonsaiList={MOCK_DATA} />);

        expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    test('空配列でもクラッシュしない', () => {
        expect(() => render(<GardenViewer bonsaiList={[]} />)).not.toThrow();
        expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    test('className が渡される', () => {
        const { container } = render(
            <GardenViewer bonsaiList={MOCK_DATA} className="test-class" />,
        );

        expect(container.firstChild).toHaveClass('test-class');
    });
});
