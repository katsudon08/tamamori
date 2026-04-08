import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockOrder = jest.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>();
const mockSelect = jest.fn<(...args: unknown[]) => { order: typeof mockOrder }>(() => ({
    order: mockOrder,
}));
const mockFrom = jest.fn<(...args: unknown[]) => { select: typeof mockSelect }>(() => ({
    select: mockSelect,
}));

jest.mock('@/shared/lib/supabase', () => ({
    createServerClient: () => ({ from: mockFrom }),
}));

import { fetchGrowthRules } from '../growth-rules';

describe('fetchGrowthRules', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('growth_rulesテーブルからsort_order昇順でルールを取得する', async () => {
        const rules = [
            { id: '1', stage: 'seed', min_messages: 0, min_reactions: 0, min_thanks: 0, sort_order: 0 },
            { id: '2', stage: 'sprout', min_messages: 5, min_reactions: 0, min_thanks: 0, sort_order: 1 },
        ];
        mockOrder.mockResolvedValue({ data: rules, error: null });

        const result = await fetchGrowthRules();

        expect(mockFrom).toHaveBeenCalledWith('growth_rules');
        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(mockOrder).toHaveBeenCalledWith('sort_order', { ascending: true });
        expect(result).toEqual(rules);
    });

    test('エラー時にthrowする', async () => {
        const error = { message: 'DB error', code: '500' };
        mockOrder.mockResolvedValue({ data: null, error });

        await expect(fetchGrowthRules()).rejects.toEqual(error);
    });
});
