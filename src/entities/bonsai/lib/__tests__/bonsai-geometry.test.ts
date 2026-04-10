import { describe, test, expect } from '@jest/globals';
import {
    seededRandom,
    createTrunkCurve,
    computeBranchTransform,
    branchLengthScale,
    computeSubBranches,
    computeLeafPositions,
    computeFlowerPositions,
    MAX_MAIN_BRANCHES,
} from '../bonsai-geometry';
import type { Branch } from '../../model/types';

describe('seededRandom', () => {
    test('同じseedから同じ乱数列を生成する', () => {
        const rng1 = seededRandom(42);
        const rng2 = seededRandom(42);
        const seq1 = Array.from({ length: 10 }, () => rng1());
        const seq2 = Array.from({ length: 10 }, () => rng2());
        expect(seq1).toEqual(seq2);
    });

    test('異なるseedから異なる乱数列を生成する', () => {
        const rng1 = seededRandom(42);
        const rng2 = seededRandom(99);
        expect(rng1()).not.toBe(rng2());
    });

    test('0〜1の範囲の値を返す', () => {
        const rng = seededRandom(12345);
        for (let i = 0; i < 100; i++) {
            const val = rng();
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThan(1);
        }
    });
});

describe('createTrunkCurve', () => {
    test('始点が鉢上面 (原点) にある', () => {
        const curve = createTrunkCurve(1.5);
        const start = curve.getPointAt(0);
        expect(start.x).toBeCloseTo(0, 5);
        expect(start.y).toBeCloseTo(0, 5);
        expect(start.z).toBeCloseTo(0, 5);
    });

    test('根元付近は垂直に立ち上がる', () => {
        const curve = createTrunkCurve(2.0);
        const near = curve.getPointAt(0.02);
        // x, z のずれがごく小さい = ほぼ垂直
        expect(Math.abs(near.x)).toBeLessThan(0.02);
        expect(Math.abs(near.z)).toBeLessThan(0.02);
        expect(near.y).toBeGreaterThan(0);
    });

    test('終点のyがheightに一致する', () => {
        const h = 2.0;
        const curve = createTrunkCurve(h);
        const end = curve.getPointAt(1);
        expect(end.y).toBeCloseTo(h, 1);
    });
});

describe('computeBranchTransform', () => {
    const branch: Branch = { angle: 45, length: 0.5, depth: 1, seed: 100 };

    test('positionが幹カーブ上にある (y が 0〜trunkHeight の範囲)', () => {
        const trunkHeight = 1.5;
        const transform = computeBranchTransform(branch, trunkHeight, 0, 5);
        expect(transform.position[1]).toBeGreaterThanOrEqual(0);
        expect(transform.position[1]).toBeLessThanOrEqual(trunkHeight * 1.1);
    });

    test('rotationが3要素である', () => {
        const transform = computeBranchTransform(branch, 1.0, 0, 5);
        expect(transform.rotation).toHaveLength(3);
    });

    test('thicknessがdepthに応じて減衰する', () => {
        const d1: Branch = { angle: 30, length: 0.5, depth: 1, seed: 1 };
        const d2: Branch = { angle: 30, length: 0.5, depth: 2, seed: 1 };
        const t1 = computeBranchTransform(d1, 1.0, 0, 5);
        const t2 = computeBranchTransform(d2, 1.0, 0, 5);
        expect(t2.thickness).toBeLessThan(t1.thickness);
    });

    test('同じ入力に対して決定的な結果を返す', () => {
        const t1 = computeBranchTransform(branch, 1.5, 0, 5);
        const t2 = computeBranchTransform(branch, 1.5, 0, 5);
        expect(t1).toEqual(t2);
    });

    test('異なる index で高さが分散する', () => {
        const count = MAX_MAIN_BRANCHES;
        const branches = Array.from({ length: count }, (_, i) => ({
            angle: 30 + i * 5,
            length: 0.5,
            depth: 1,
            seed: 1000 + i,
        }));
        const ys = branches.map((b, i) =>
            computeBranchTransform(b, 2.0, i, count).position[1],
        );
        // ソートして隣接差を確認: 同じ高さに集中していないこと
        const sorted = [...ys].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i] - sorted[i - 1]).toBeGreaterThan(0.05);
        }
    });
});

describe('branchLengthScale', () => {
    test('低い位置の枝ほどスケールが大きい', () => {
        const s0 = branchLengthScale(0, 10);
        const s9 = branchLengthScale(9, 10);
        expect(s0).toBeGreaterThan(s9);
    });

    test('全ての値が 0 より大きい (主枝数上限内)', () => {
        for (let i = 0; i < MAX_MAIN_BRANCHES; i++) {
            expect(branchLengthScale(i, MAX_MAIN_BRANCHES)).toBeGreaterThan(0);
        }
    });
});

describe('computeSubBranches', () => {
    test('depth 1 から 2〜3 本の中枝を生成する', () => {
        const subs = computeSubBranches(0.5, 1, 42);
        expect(subs.length).toBeGreaterThanOrEqual(2);
        expect(subs.length).toBeLessThanOrEqual(3);
        for (const sub of subs) {
            expect(sub.depth).toBe(2);
            expect(sub.length).toBeLessThan(0.5 * 0.51);
        }
    });

    test('depth 2 から 0〜1 本の小枝を生成する', () => {
        const subs = computeSubBranches(0.3, 2, 42);
        expect(subs.length).toBeLessThanOrEqual(1);
        for (const sub of subs) {
            expect(sub.depth).toBe(3);
        }
    });

    test('分岐位置が枝の 30%〜80% に収まる', () => {
        const subs = computeSubBranches(1.0, 1, 42);
        for (const sub of subs) {
            expect(sub.attachT).toBeGreaterThanOrEqual(0.29);
            expect(sub.attachT).toBeLessThanOrEqual(0.81);
        }
    });

    test('分岐角度が左右交互になる', () => {
        const subs = computeSubBranches(1.0, 1, 42);
        if (subs.length >= 2) {
            expect(Math.sign(subs[0].angle)).not.toBe(Math.sign(subs[1].angle));
        }
    });

    test('depth 3 では分岐しない', () => {
        expect(computeSubBranches(0.2, 3, 42)).toHaveLength(0);
    });

    test('同じ入力に対して決定的な結果を返す', () => {
        const s1 = computeSubBranches(0.5, 1, 999);
        const s2 = computeSubBranches(0.5, 1, 999);
        expect(s1).toEqual(s2);
    });
});

describe('MAX_MAIN_BRANCHES', () => {
    test('主枝の上限が 4 である', () => {
        expect(MAX_MAIN_BRANCHES).toBe(4);
    });
});

describe('computeLeafPositions', () => {
    const branches: Branch[] = [
        { angle: 45, length: 0.8, depth: 1, seed: 100 },
        { angle: -30, length: 0.6, depth: 1, seed: 200 },
    ];

    test('指定したcount分の位置を返す', () => {
        const positions = computeLeafPositions(20, branches, 1.5);
        expect(positions).toHaveLength(20);
    });

    test('count=0のとき空配列を返す', () => {
        expect(computeLeafPositions(0, branches, 1.5)).toHaveLength(0);
    });

    test('枝がないとき幹の頂点付近に配置する', () => {
        const positions = computeLeafPositions(5, [], 1.0);
        expect(positions).toHaveLength(5);
        for (const pos of positions) {
            expect(pos[1]).toBeGreaterThan(0);
        }
    });

    test('各位置が[x, y, z]の3要素配列である', () => {
        const positions = computeLeafPositions(10, branches, 1.5);
        for (const pos of positions) {
            expect(pos).toHaveLength(3);
            expect(typeof pos[0]).toBe('number');
        }
    });

    test('同じ入力に対して決定的な結果を返す', () => {
        const p1 = computeLeafPositions(10, branches, 1.5);
        const p2 = computeLeafPositions(10, branches, 1.5);
        expect(p1).toEqual(p2);
    });
});

describe('computeFlowerPositions', () => {
    const branches: Branch[] = [
        { angle: 45, length: 0.8, depth: 1, seed: 100 },
        { angle: -30, length: 0.6, depth: 1, seed: 200 },
    ];

    test('指定したcount分の位置を返す', () => {
        expect(computeFlowerPositions(10, branches, 1.5)).toHaveLength(10);
    });

    test('count=0のとき空配列を返す', () => {
        expect(computeFlowerPositions(0, branches, 1.5)).toHaveLength(0);
    });

    test('同じ入力に対して決定的な結果を返す', () => {
        const p1 = computeFlowerPositions(10, branches, 1.5);
        const p2 = computeFlowerPositions(10, branches, 1.5);
        expect(p1).toEqual(p2);
    });
});
