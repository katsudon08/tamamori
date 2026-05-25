import { hashForBranch } from '../lib/hash';
import type { GrowthRule } from './growth-rules';

import type { GrowthStage, BonsaiVisualState, Branch } from '@/entities/bonsai';

// --- 幹パラメータ ---
const TRUNK_HEIGHT_BASE = 0.3;
const TRUNK_HEIGHT_RATE = 0.007;
const TRUNK_HEIGHT_MAX = 2.0;

const TRUNK_THICKNESS_BASE = 0.05;
const TRUNK_THICKNESS_RATE = 0.001;
const TRUNK_THICKNESS_MAX = 0.25;

// --- 枝・葉・花の上限と倍率 ---
const BRANCH_MAX = 20;
const BRANCH_PER_MESSAGES = 8;

const LEAVES_MAX = 80;
const LEAVES_PER_REACTIONS = 2;

const FLOWERS_MAX = 30;
const FLOWERS_PER_THANKS = 3;

// --- 枝の長さ導出 ---
const BRANCH_LENGTH_BASE = 0.3;
const BRANCH_LENGTH_SEED_MOD = 100;
const BRANCH_LENGTH_SEED_DIVISOR = 200;

// --- 枝の深度 ---
const BRANCH_DEPTH_LEVELS = 3;

// --- デフォルト色 ---
const DEFAULT_LEAF_COLOR = '#228B22';
const DEFAULT_FLOWER_COLOR = '#FFB7C5';
const DEFAULT_POT_COLOR = '#8B4513';

// --- フォールバックステージ ---
const FALLBACK_STAGE: GrowthStage = 'seed';

export interface Counters {
    totalMessages: number;
    totalReactions: number;
    totalThanks: number;
}

export function determineStage(counters: Counters, rules: GrowthRule[]): GrowthStage {
    const sorted = [...rules].sort((a, b) => b.sort_order - a.sort_order);

    for (const rule of sorted) {
        if (
            counters.totalMessages >= rule.min_messages &&
            counters.totalReactions >= rule.min_reactions &&
            counters.totalThanks >= rule.min_thanks
        ) {
            return rule.stage;
        }
    }

    return FALLBACK_STAGE;
}

export function computeVisualState(counters: Counters, userId: string): BonsaiVisualState {
    const trunkHeight = Math.min(
        TRUNK_HEIGHT_MAX,
        TRUNK_HEIGHT_BASE + counters.totalMessages * TRUNK_HEIGHT_RATE,
    );
    const trunkThickness = Math.min(
        TRUNK_THICKNESS_MAX,
        TRUNK_THICKNESS_BASE + counters.totalMessages * TRUNK_THICKNESS_RATE,
    );
    const branchCount = Math.min(
        BRANCH_MAX,
        Math.floor(counters.totalMessages / BRANCH_PER_MESSAGES),
    );
    const leaves = Math.min(LEAVES_MAX, Math.floor(counters.totalReactions / LEAVES_PER_REACTIONS));
    const flowers = Math.min(FLOWERS_MAX, Math.floor(counters.totalThanks / FLOWERS_PER_THANKS));

    const branches: Branch[] = [];
    for (let i = 0; i < branchCount; i++) {
        const { angle, seed } = hashForBranch(userId, i);
        branches.push({
            angle,
            length:
                BRANCH_LENGTH_BASE + (seed % BRANCH_LENGTH_SEED_MOD) / BRANCH_LENGTH_SEED_DIVISOR,
            depth: (i % BRANCH_DEPTH_LEVELS) + 1,
            seed,
        });
    }

    return {
        trunkHeight,
        trunkThickness,
        branches,
        leaves,
        leafColor: DEFAULT_LEAF_COLOR,
        flowers,
        flowerColor: DEFAULT_FLOWER_COLOR,
        potColor: DEFAULT_POT_COLOR,
    };
}
