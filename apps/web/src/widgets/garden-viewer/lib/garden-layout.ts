export const GARDEN_SPACING = 3.0;
export const GARDEN_BONSAI_SCALE = 0.6;
export const GARDEN_CAMERA_FOV = 45;

// y:z = sin(31.8°):cos(31.8°) — 見下ろし角度を一定にしつつ距離だけスケール
const CAMERA_PITCH_SIN = 0.527;
const CAMERA_PITCH_COS = 0.85;
const MIN_CAMERA_DISTANCE = 5;
const CAMERA_DISTANCE_MARGIN = 1;

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

/** 盆栽数に合わせて全体がフィットするカメラ位置を算出する。グリッドの対角距離に比例。 */
export function computeCameraPosition(count: number): [number, number, number] {
  const safeCount = Math.max(count, 1);
  const cols = Math.ceil(Math.sqrt(safeCount));
  const rows = Math.ceil(safeCount / cols);
  const width = (cols - 1) * GARDEN_SPACING;
  const depth = (rows - 1) * GARDEN_SPACING;
  const diag = Math.sqrt(width * width + depth * depth);
  const distance = Math.max(diag + CAMERA_DISTANCE_MARGIN, MIN_CAMERA_DISTANCE);
  return [0, distance * CAMERA_PITCH_SIN, distance * CAMERA_PITCH_COS];
}
