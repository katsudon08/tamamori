import { describe, test, expect } from '@jest/globals';
import { hashForBranch } from '../hash';

describe('hashForBranch', () => {
    test('同じ入力に対して常に同じ結果を返す', () => {
        const result1 = hashForBranch('user-abc', 0);
        const result2 = hashForBranch('user-abc', 0);

        expect(result1).toEqual(result2);
        expect(typeof result1.angle).toBe('number');
        expect(typeof result1.seed).toBe('number');
        expect(result1.angle).toBeGreaterThanOrEqual(0);
        expect(result1.angle).toBeLessThan(360);
    });

    test('異なる入力に対して異なる結果を返す', () => {
        const a = hashForBranch('user-abc', 0);
        const b = hashForBranch('user-abc', 1);
        const c = hashForBranch('user-xyz', 0);

        expect(a).not.toEqual(b);
        expect(a).not.toEqual(c);
    });
});
