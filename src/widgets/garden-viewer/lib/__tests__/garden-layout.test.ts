import { describe, test, expect } from '@jest/globals';
import { computeCameraPosition, computeGridPositions, GARDEN_SPACING } from '../garden-layout';

describe('computeGridPositions', () => {
    test('1個のとき原点に配置する', () => {
        const positions = computeGridPositions(1);
        expect(positions).toHaveLength(1);
        expect(positions[0]).toEqual([0, 0, 0]);
    });

    test('6個のとき3列×2行のグリッドを生成する', () => {
        const positions = computeGridPositions(6);
        expect(positions).toHaveLength(6);

        // 列数: ceil(sqrt(6)) = 3
        const cols = new Set(positions.map(([x]) => x));
        const rows = new Set(positions.map(([, , z]) => z));
        expect(cols.size).toBe(3);
        expect(rows.size).toBe(2);
    });

    test('12個のとき4列×3行のグリッドを生成する', () => {
        const positions = computeGridPositions(12);
        expect(positions).toHaveLength(12);

        const cols = new Set(positions.map(([x]) => x));
        const rows = new Set(positions.map(([, , z]) => z));
        expect(cols.size).toBe(4);
        expect(rows.size).toBe(3);
    });

    test('20個のとき5列×4行のグリッドを生成する', () => {
        const positions = computeGridPositions(20);
        expect(positions).toHaveLength(20);

        const cols = new Set(positions.map(([x]) => x));
        const rows = new Set(positions.map(([, , z]) => z));
        expect(cols.size).toBe(5);
        expect(rows.size).toBe(4);
    });

    test('原点を中心に対称配置する', () => {
        const positions = computeGridPositions(6);
        const avgX = positions.reduce((sum, [x]) => sum + x, 0) / positions.length;
        const avgZ = positions.reduce((sum, [, , z]) => sum + z, 0) / positions.length;
        expect(avgX).toBeCloseTo(0, 5);
        expect(avgZ).toBeCloseTo(0, 5);
    });

    test('隣接アイテム間のx距離がGARDEN_SPACINGに等しい', () => {
        const positions = computeGridPositions(6);
        // 同一行のアイテムを取得 (z が同じ)
        const firstRowZ = positions[0][2];
        const firstRow = positions.filter(([, , z]) => z === firstRowZ);
        firstRow.sort((a, b) => a[0] - b[0]);

        for (let i = 1; i < firstRow.length; i++) {
            const dx = firstRow[i][0] - firstRow[i - 1][0];
            expect(dx).toBeCloseTo(GARDEN_SPACING, 5);
        }
    });

    test('隣接行間のz距離がGARDEN_SPACINGに等しい', () => {
        const positions = computeGridPositions(6);
        const zValues = [...new Set(positions.map(([, , z]) => z))].sort(
            (a: number, b: number) => a - b,
        );

        for (let i = 1; i < zValues.length; i++) {
            const dz = zValues[i] - zValues[i - 1];
            expect(dz).toBeCloseTo(GARDEN_SPACING, 5);
        }
    });

    test('全ポジションのy座標が0である', () => {
        const positions = computeGridPositions(10);
        for (const [, y] of positions) {
            expect(y).toBe(0);
        }
    });

    test('端数がある場合も正しくグリッド化する (7個 → 3列×3行、最終行は1個)', () => {
        const positions = computeGridPositions(7);
        expect(positions).toHaveLength(7);

        const cols = new Set(positions.map(([x]) => x));
        expect(cols.size).toBe(3);
    });
});

describe('computeCameraPosition', () => {
    test('x 座標は常に 0 (原点を見下ろす)', () => {
        for (const count of [1, 4, 6, 8, 12, 20]) {
            const [x] = computeCameraPosition(count);
            expect(x).toBe(0);
        }
    });

    test('y と z は正で z > y (見下ろし角度を保つ)', () => {
        for (const count of [1, 4, 6, 8, 12, 20]) {
            const [, y, z] = computeCameraPosition(count);
            expect(y).toBeGreaterThan(0);
            expect(z).toBeGreaterThan(y);
        }
    });

    test('盆栽数が増えると距離が大きくなる', () => {
        const [, , z6] = computeCameraPosition(6);
        const [, , z8] = computeCameraPosition(8);
        const [, , z12] = computeCameraPosition(12);
        const [, , z20] = computeCameraPosition(20);
        expect(z8).toBeGreaterThan(z6);
        expect(z12).toBeGreaterThan(z8);
        expect(z20).toBeGreaterThan(z12);
    });

    test('6個で z ≈ 6.5 (3列×2行のケース)', () => {
        const [, , z] = computeCameraPosition(6);
        expect(z).toBeCloseTo(6.55, 1);
    });

    test('8個で z ≈ 8 (3列×3行のケース)', () => {
        const [, , z] = computeCameraPosition(8);
        expect(z).toBeCloseTo(8.06, 1);
    });

    test('1個のときも最低距離を確保する', () => {
        const [, y, z] = computeCameraPosition(1);
        expect(y).toBeGreaterThanOrEqual(2.5);
        expect(z).toBeGreaterThanOrEqual(4);
    });

    test('0個でもエラーを投げない', () => {
        expect(() => computeCameraPosition(0)).not.toThrow();
    });
});
