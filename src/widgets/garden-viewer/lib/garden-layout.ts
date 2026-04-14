export const GARDEN_SPACING = 3.0;
export const GARDEN_BONSAI_SCALE = 0.6;

export function computeGridPositions(count: number): [number, number, number][] {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const positions: [number, number, number][] = [];

    for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = (col - (cols - 1) / 2) * GARDEN_SPACING;
        const z = (row - (rows - 1) / 2) * GARDEN_SPACING;
        positions.push([x, 0, z]);
    }

    return positions;
}
