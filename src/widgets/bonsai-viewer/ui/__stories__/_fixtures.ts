import type { Bonsai, BonsaiVisualState, GrowthStage } from '@/entities/bonsai';

// --- 各ステージのビジュアルステート ---

const SEED_STATE: BonsaiVisualState = {
    trunkHeight: 0.3,
    trunkThickness: 0.05,
    branches: [],
    leaves: 0,
    leafColor: '#228B22',
    flowers: 0,
    flowerColor: '#FFB7C5',
    potColor: '#8B4513',
};

const SPROUT_STATE: BonsaiVisualState = {
    trunkHeight: 0.5,
    trunkThickness: 0.07,
    branches: [],
    leaves: 0,
    leafColor: '#228B22',
    flowers: 0,
    flowerColor: '#FFB7C5',
    potColor: '#8B4513',
};

/**
 * young 以降の全ステージは full_bloom の形をベースに
 * 枝の角度・seed を統一し、サイズ・葉・花を段階的にスケールダウンする。
 *
 * full_bloom 基準枝:
 *   { angle: 50, length: 1.4, depth: 1, seed: 1001 }
 *   { angle: -45, length: 1.2, depth: 1, seed: 2002 }
 *   { angle: 40, length: 1.1, depth: 1, seed: 3003 }
 *   { angle: -35, length: 1.0, depth: 1, seed: 4004 }
 */

const YOUNG_STATE: BonsaiVisualState = {
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
};

const BRANCHING_STATE: BonsaiVisualState = {
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
};

const LEAFY_STATE: BonsaiVisualState = {
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
};

const BUDDING_STATE: BonsaiVisualState = {
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
};

const FLOWERING_STATE: BonsaiVisualState = {
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
};

const FULL_BLOOM_STATE: BonsaiVisualState = {
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

// --- ステージごとのビジュアルステートマップ ---

export const VISUAL_STATES: Record<GrowthStage, BonsaiVisualState> = {
    seed: SEED_STATE,
    sprout: SPROUT_STATE,
    young: YOUNG_STATE,
    branching: BRANCHING_STATE,
    leafy: LEAFY_STATE,
    budding: BUDDING_STATE,
    flowering: FLOWERING_STATE,
    full_bloom: FULL_BLOOM_STATE,
};

// --- 成長ルール閾値（docs/data-model.md の初期データに基づく） ---

type StageThresholds = {
    min_messages: number;
    min_reactions: number;
    min_thanks: number;
};

const STAGE_THRESHOLDS: Record<GrowthStage, StageThresholds> = {
    seed: { min_messages: 0, min_reactions: 0, min_thanks: 0 },
    sprout: { min_messages: 5, min_reactions: 0, min_thanks: 0 },
    young: { min_messages: 15, min_reactions: 5, min_thanks: 0 },
    branching: { min_messages: 30, min_reactions: 15, min_thanks: 3 },
    leafy: { min_messages: 60, min_reactions: 30, min_thanks: 10 },
    budding: { min_messages: 100, min_reactions: 50, min_thanks: 20 },
    flowering: { min_messages: 150, min_reactions: 80, min_thanks: 35 },
    full_bloom: { min_messages: 250, min_reactions: 120, min_thanks: 60 },
};

const STAGE_ORDER: GrowthStage[] = [
    'seed',
    'sprout',
    'young',
    'branching',
    'leafy',
    'budding',
    'flowering',
    'full_bloom',
];

/** 指定ステージの次ステージ閾値を返す。full_bloom なら null */
export function getNextStageThresholds(stage: GrowthStage): StageThresholds | null {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
    return STAGE_THRESHOLDS[STAGE_ORDER[idx + 1]];
}

// --- ステージごとのカウンター例 ---

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

// --- モックユーザー ---

export const MOCK_USER = {
    display_name: 'テストユーザー',
    avatar_url: 'https://example.com/avatar.png',
};

export const MOCK_USER_NO_AVATAR = {
    display_name: 'アバターなしユーザー',
    avatar_url: null,
};

// --- Bonsai モックファクトリ ---

const BASE_BONSAI: Bonsai = {
    id: '00000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000010',
    total_messages: 0,
    total_reactions: 0,
    total_thanks: 0,
    growth_stage: 'seed',
    visual_state: SEED_STATE,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

export function makeBonsai(stage: GrowthStage): Bonsai {
    return {
        ...BASE_BONSAI,
        ...STAGE_COUNTERS[stage],
        growth_stage: stage,
        visual_state: VISUAL_STATES[stage],
    };
}
