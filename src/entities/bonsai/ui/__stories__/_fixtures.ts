import type { BonsaiVisualState } from '../../model/types';

/** seed ステージ: 幹のみ、枝・葉・花なし */
export const SEED_STATE: BonsaiVisualState = {
    trunkHeight: 0.3,
    trunkThickness: 0.05,
    branches: [],
    leaves: 0,
    leafColor: '#228B22',
    flowers: 0,
    flowerColor: '#FFB7C5',
    potColor: '#8B4513',
};

/** sprout ステージ: 少し成長 */
export const SPROUT_STATE: BonsaiVisualState = {
    trunkHeight: 0.5,
    trunkThickness: 0.07,
    branches: [],
    leaves: 0,
    leafColor: '#228B22',
    flowers: 0,
    flowerColor: '#FFB7C5',
    potColor: '#8B4513',
};

/** branching ステージ: 主枝が伸び始める */
export const BRANCHING_STATE: BonsaiVisualState = {
    trunkHeight: 1.0,
    trunkThickness: 0.12,
    branches: [
        { angle: 40, length: 0.7, depth: 1, seed: 1001 },
        { angle: -35, length: 0.6, depth: 1, seed: 2002 },
        { angle: 30, length: 0.5, depth: 1, seed: 3003 },
    ],
    leaves: 50,
    leafColor: '#228B22',
    flowers: 0,
    flowerColor: '#FFB7C5',
    potColor: '#8B4513',
};

/** leafy ステージ: 主枝が骨格を形成し葉が茂る */
export const LEAFY_STATE: BonsaiVisualState = {
    trunkHeight: 1.4,
    trunkThickness: 0.16,
    branches: [
        { angle: 45, length: 1.0, depth: 1, seed: 1001 },
        { angle: -40, length: 0.9, depth: 1, seed: 2002 },
        { angle: 35, length: 0.8, depth: 1, seed: 3003 },
        { angle: -30, length: 0.7, depth: 1, seed: 4004 },
    ],
    leaves: 180,
    leafColor: '#228B22',
    flowers: 0,
    flowerColor: '#FFB7C5',
    potColor: '#8B4513',
};

/** full_bloom ステージ: 主枝が大きく広がり、葉・花満開 */
export const FULL_BLOOM_STATE: BonsaiVisualState = {
    trunkHeight: 2.0,
    trunkThickness: 0.25,
    branches: [
        { angle: 50, length: 1.4, depth: 1, seed: 1001 },
        { angle: -45, length: 1.2, depth: 1, seed: 2002 },
        { angle: 40, length: 1.1, depth: 1, seed: 3003 },
        { angle: -35, length: 1.0, depth: 1, seed: 4004 },
    ],
    leaves: 300,
    leafColor: '#228B22',
    flowers: 80,
    flowerColor: '#FFB7C5',
    potColor: '#8B4513',
};
