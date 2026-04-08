import { describe, test, expect } from '@jest/globals';
import { determineStage, computeVisualState, type Counters } from '../growth-engine';
import type { GrowthRule } from '../growth-rules';

const RULES: GrowthRule[] = [
    { id: '1', stage: 'seed', min_messages: 0, min_reactions: 0, min_thanks: 0, sort_order: 0 },
    { id: '2', stage: 'sprout', min_messages: 5, min_reactions: 0, min_thanks: 0, sort_order: 1 },
    { id: '3', stage: 'young', min_messages: 15, min_reactions: 5, min_thanks: 0, sort_order: 2 },
    {
        id: '4',
        stage: 'branching',
        min_messages: 30,
        min_reactions: 15,
        min_thanks: 3,
        sort_order: 3,
    },
    { id: '5', stage: 'leafy', min_messages: 60, min_reactions: 30, min_thanks: 10, sort_order: 4 },
    {
        id: '6',
        stage: 'budding',
        min_messages: 100,
        min_reactions: 50,
        min_thanks: 20,
        sort_order: 5,
    },
    {
        id: '7',
        stage: 'flowering',
        min_messages: 150,
        min_reactions: 80,
        min_thanks: 35,
        sort_order: 6,
    },
    {
        id: '8',
        stage: 'full_bloom',
        min_messages: 250,
        min_reactions: 120,
        min_thanks: 60,
        sort_order: 7,
    },
];

describe('determineStage', () => {
    test('(0, 0, 0) → seed', () => {
        expect(determineStage({ totalMessages: 0, totalReactions: 0, totalThanks: 0 }, RULES)).toBe(
            'seed',
        );
    });

    test('(5, 0, 0) → sprout', () => {
        expect(determineStage({ totalMessages: 5, totalReactions: 0, totalThanks: 0 }, RULES)).toBe(
            'sprout',
        );
    });

    test('(15, 5, 0) → young', () => {
        expect(
            determineStage({ totalMessages: 15, totalReactions: 5, totalThanks: 0 }, RULES),
        ).toBe('young');
    });

    test('(30, 15, 3) → branching', () => {
        expect(
            determineStage({ totalMessages: 30, totalReactions: 15, totalThanks: 3 }, RULES),
        ).toBe('branching');
    });

    test('(250, 120, 60) → full_bloom', () => {
        expect(
            determineStage({ totalMessages: 250, totalReactions: 120, totalThanks: 60 }, RULES),
        ).toBe('full_bloom');
    });

    test('一つでも閾値未達なら前ステージ: (150, 80, 34) → budding (thanks=34 < 35)', () => {
        expect(
            determineStage({ totalMessages: 150, totalReactions: 80, totalThanks: 34 }, RULES),
        ).toBe('budding');
    });
});

describe('computeVisualState', () => {
    test('totalMessages=0 → trunkHeight=0.3, trunkThickness=0.05, branches=[]', () => {
        const result = computeVisualState(
            { totalMessages: 0, totalReactions: 0, totalThanks: 0 },
            'user-1',
        );

        expect(result.trunkHeight).toBe(0.3);
        expect(result.trunkThickness).toBe(0.05);
        expect(result.branches).toEqual([]);
        expect(result.leaves).toBe(0);
        expect(result.flowers).toBe(0);
        expect(result.leafColor).toBe('#228B22');
        expect(result.flowerColor).toBe('#FFB7C5');
        expect(result.potColor).toBe('#8B4513');
    });

    test('totalMessages=243 → trunkHeight=min(2.0, 0.3+243*0.007)=2.0 (clamp確認)', () => {
        const result = computeVisualState(
            { totalMessages: 243, totalReactions: 0, totalThanks: 0 },
            'user-1',
        );

        expect(result.trunkHeight).toBe(2.0);
    });

    test('totalReactions=160 → leaves=min(80, 80)=80 (clamp確認)', () => {
        const result = computeVisualState(
            { totalMessages: 0, totalReactions: 160, totalThanks: 0 },
            'user-1',
        );

        expect(result.leaves).toBe(80);
    });

    test('同じuserId + 同じcounters → 常に同じ出力 (決定性)', () => {
        const counters: Counters = { totalMessages: 50, totalReactions: 20, totalThanks: 5 };

        const result1 = computeVisualState(counters, 'user-deterministic');
        const result2 = computeVisualState(counters, 'user-deterministic');

        expect(result1).toEqual(result2);
    });
});
