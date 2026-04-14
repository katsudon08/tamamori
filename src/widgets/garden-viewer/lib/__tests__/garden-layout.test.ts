import { describe, test, expect } from '@jest/globals';
import { computeGridPositions, GARDEN_SPACING } from '../garden-layout';

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
