import type { Bonsai, BonsaiVisualState, GrowthStage } from '@/entities/bonsai';

// --- 各ステージのビジュアルステート (bonsai-viewer fixtures と同一定義) ---

const VISUAL_STATES: Record<GrowthStage, BonsaiVisualState> = {
    seed: {
        trunkHeight: 0.3,
        trunkThickness: 0.05,
        branches: [],
        leaves: 0,
        leafColor: '#228B22',
        flowers: 0,
        flowerColor: '#FFB7C5',
        potColor: '#8B4513',
    },
    sprout: {
        trunkHeight: 0.5,
        trunkThickness: 0.07,
        branches: [],
        leaves: 0,
        leafColor: '#228B22',
        flowers: 0,
        flowerColor: '#FFB7C5',
        potColor: '#8B4513',
    },
    young: {
        trunkHeight: 0.7,
        trunkThickness: 0.09,
        branches: [
            { angle: 50, length: 0.7, depth: 1, seed: 1001 },
            { angle: -45, length: 0.6, depth: 1, seed: 2002 },
        ],
        leaves: 15,
        leafColor: '#228B22',
        flowers: 0,
        flowerColor: '#FFB7C5',
        potColor: '#8B4513',
    },
    branching: {
        trunkHeight: 1.0,
        trunkThickness: 0.12,
        branches: [
            { angle: 50, length: 0.8, depth: 1, seed: 1001 },
            { angle: -45, length: 0.7, depth: 1, seed: 2002 },
            { angle: 40, length: 0.6, depth: 1, seed: 3003 },
        ],
        leaves: 50,
        leafColor: '#228B22',
        flowers: 0,
        flowerColor: '#FFB7C5',
        potColor: '#8B4513',
    },
    leafy: {
        trunkHeight: 1.4,
        trunkThickness: 0.16,
        branches: [
            { angle: 50, length: 1.0, depth: 1, seed: 1001 },
            { angle: -45, length: 0.9, depth: 1, seed: 2002 },
            { angle: 40, length: 0.8, depth: 1, seed: 3003 },
            { angle: -35, length: 0.7, depth: 1, seed: 4004 },
        ],
        leaves: 200,
        leafColor: '#228B22',
        flowers: 0,
        flowerColor: '#FFB7C5',
        potColor: '#8B4513',
    },
    budding: {
        trunkHeight: 1.6,
        trunkThickness: 0.18,
        branches: [
            { angle: 50, length: 1.1, depth: 1, seed: 1001 },
            { angle: -45, length: 1.0, depth: 1, seed: 2002 },
            { angle: 40, length: 0.9, depth: 1, seed: 3003 },
            { angle: -35, length: 0.8, depth: 1, seed: 4004 },
        ],
        leaves: 240,
        leafColor: '#228B22',
        flowers: 15,
        flowerColor: '#FFB7C5',
        potColor: '#8B4513',
    },
    flowering: {
        trunkHeight: 1.8,
        trunkThickness: 0.22,
        branches: [
            { angle: 50, length: 1.3, depth: 1, seed: 1001 },
            { angle: -45, length: 1.1, depth: 1, seed: 2002 },
            { angle: 40, length: 1.0, depth: 1, seed: 3003 },
            { angle: -35, length: 0.9, depth: 1, seed: 4004 },
        ],
        leaves: 260,
        leafColor: '#228B22',
        flowers: 45,
        flowerColor: '#FFB7C5',
        potColor: '#8B4513',
    },
    full_bloom: {
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
    },
};

// --- Garden用の型 (useAllBonsai の戻り値に対応) ---

export type GardenBonsaiItem = Bonsai & {
    users: { display_name: string; avatar_url: string | null };
};

// --- モックデータ ---

const NAMES = ['田中太郎', '鈴木花子', '佐藤健太', '山田美咲', '渡辺翔', '中村あゆみ'];

const STAGE_COUNTERS: Record<
    GrowthStage,
    { total_messages: number; total_reactions: number; total_thanks: number }
> = {
    seed: { total_messages: 0, total_reactions: 0, total_thanks: 0 },
    sprout: { total_messages: 8, total_reactions: 2, total_thanks: 0 },
    young: { total_messages: 20, total_reactions: 8, total_thanks: 1 },
    branching: { total_messages: 40, total_reactions: 20, total_thanks: 5 },
    leafy: { total_messages: 75, total_reactions: 40, total_thanks: 15 },
    budding: { total_messages: 120, total_reactions: 60, total_thanks: 25 },
    flowering: { total_messages: 180, total_reactions: 100, total_thanks: 45 },
    full_bloom: { total_messages: 300, total_reactions: 150, total_thanks: 80 },
};

export function makeGardenBonsai(stage: GrowthStage, index: number): GardenBonsaiItem {
    return {
        id: `00000000-0000-0000-0000-00000000000${index}`,
        user_id: `00000000-0000-0000-0000-00000000010${index}`,
        ...STAGE_COUNTERS[stage],
        growth_stage: stage,
        visual_state: VISUAL_STATES[stage],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        users: {
            display_name: NAMES[index % NAMES.length],
            avatar_url: index % 3 === 0 ? null : `https://example.com/avatar${index}.png`,
        },
    };
}

/** 6盆栽: seed〜budding の各ステージ */
export const MOCK_GARDEN_6: GardenBonsaiItem[] = (
    ['seed', 'sprout', 'young', 'branching', 'leafy', 'budding'] as const
).map((stage, i) => makeGardenBonsai(stage, i));

/** 8盆栽: 全ステージ */
export const MOCK_GARDEN_MIXED: GardenBonsaiItem[] = (
    ['seed', 'sprout', 'young', 'branching', 'leafy', 'budding', 'flowering', 'full_bloom'] as const
).map((stage, i) => makeGardenBonsai(stage, i));
