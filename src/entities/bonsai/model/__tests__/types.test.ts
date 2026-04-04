import { describe, test, expect } from '@jest/globals';
import { ZodError } from 'zod';
import { growthStageSchema, branchSchema, visualStateSchema, bonsaiSchema } from '../types';

const VALID_BRANCH = {
    angle: 45,
    length: 0.5,
    depth: 1,
    seed: 12345,
};

const VALID_VISUAL_STATE = {
    trunkHeight: 1.0,
    trunkThickness: 0.1,
    branches: [VALID_BRANCH],
    leaves: 20,
    leafColor: '#228B22',
    flowers: 5,
    flowerColor: '#FF69B4',
    potColor: '#8B4513',
};

const VALID_BONSAI = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: '660e8400-e29b-41d4-a716-446655440000',
    total_messages: 100,
    total_reactions: 50,
    total_thanks: 10,
    growth_stage: 'leafy' as const,
    visual_state: VALID_VISUAL_STATE,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
};

describe('growthStageSchema', () => {
    test('有効なステージをパースできる', () => {
        const stages = [
            'seed',
            'sprout',
            'young',
            'branching',
            'leafy',
            'budding',
            'flowering',
            'full_bloom',
        ];
        for (const stage of stages) {
            expect(growthStageSchema.parse(stage)).toBe(stage);
        }
    });

    test('無効なステージでZodErrorをthrowする', () => {
        expect(() => growthStageSchema.parse('invalid')).toThrow(ZodError);
    });
});

describe('branchSchema', () => {
    test('有効なブランチデータをパースできる', () => {
        expect(branchSchema.parse(VALID_BRANCH)).toEqual(VALID_BRANCH);
    });

    test('depthが小数の場合にZodErrorをthrowする', () => {
        expect(() => branchSchema.parse({ ...VALID_BRANCH, depth: 1.5 })).toThrow(ZodError);
    });
});

describe('visualStateSchema', () => {
    test('有効なvisual_stateをパースできる', () => {
        expect(visualStateSchema.parse(VALID_VISUAL_STATE)).toEqual(VALID_VISUAL_STATE);
    });

    test('必須フィールドが欠損した場合にZodErrorをthrowする', () => {
        expect(() => visualStateSchema.parse({})).toThrow(ZodError);
    });
});

describe('bonsaiSchema', () => {
    test('有効なbonsaiデータをパースできる', () => {
        expect(bonsaiSchema.parse(VALID_BONSAI)).toEqual(VALID_BONSAI);
    });

    test('idがUUID形式でない場合にZodErrorをthrowする', () => {
        expect(() => bonsaiSchema.parse({ ...VALID_BONSAI, id: 'not-uuid' })).toThrow(ZodError);
    });

    test('total_messagesが小数の場合にZodErrorをthrowする', () => {
        expect(() => bonsaiSchema.parse({ ...VALID_BONSAI, total_messages: 1.5 })).toThrow(
            ZodError,
        );
    });
});
