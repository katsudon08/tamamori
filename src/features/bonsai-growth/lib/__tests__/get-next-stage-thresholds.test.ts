import { describe, test, expect } from '@jest/globals';
import { getNextStageThresholds } from '../get-next-stage-thresholds';
import type { GrowthRule } from '../../model/growth-rules';

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

describe('getNextStageThresholds', () => {
    test('seed → sprout の閾値を返す', () => {
        expect(getNextStageThresholds('seed', RULES)).toEqual({
            min_messages: 5,
            min_reactions: 0,
            min_thanks: 0,
        });
    });

    test('sprout → young の閾値を返す', () => {
        expect(getNextStageThresholds('sprout', RULES)).toEqual({
            min_messages: 15,
            min_reactions: 5,
            min_thanks: 0,
        });
    });

    test('flowering → full_bloom の閾値を返す', () => {
        expect(getNextStageThresholds('flowering', RULES)).toEqual({
            min_messages: 250,
            min_reactions: 120,
            min_thanks: 60,
        });
    });

    test('full_bloom → null を返す（最終ステージ）', () => {
        expect(getNextStageThresholds('full_bloom', RULES)).toBeNull();
    });

    test('存在しないステージ → null を返す', () => {
        expect(getNextStageThresholds('unknown' as never, RULES)).toBeNull();
    });
});
