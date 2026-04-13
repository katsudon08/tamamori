import * as THREE from 'three';
import type { Branch } from '../model/types';

/**
 * 決定的擬似乱数生成器 (mulberry32)
 * 同じ seed から常に同じ乱数列を生成する
 */
export function seededRandom(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ─── 幹カーブ（Trunk と Branch で共有） ───

/**
 * 盆栽の幹の S 字カーブを生成する
 * Trunk.tsx と Branch 配置ロジックの両方から参照される SSoT
 *
 * 5つの制御点で明確な S 字を描き、Z 方向にも微妙に揺らして
 * 正面から見ても横から見ても単調にならないようにする
 */
export function createTrunkCurve(height: number): THREE.CatmullRomCurve3 {
    const s = height * 0.15; // S字の振幅
    // 根元の垂直立ち上がり高さ (幹の 8%)
    const rise = height * 0.08;
    return new THREE.CatmullRomCurve3(
        [
            new THREE.Vector3(0, 0, 0),              // 鉢上面 (水平)
            new THREE.Vector3(0, rise, 0),            // 垂直に立ち上がり → 底面リングが水平になる
            new THREE.Vector3(s, height * 0.3, s * 0.3),
            new THREE.Vector3(-s * 0.7, height * 0.55, -s * 0.2),
            new THREE.Vector3(s * 0.4, height * 0.8, s * 0.15),
            new THREE.Vector3(0, height, 0),
        ],
        false,
        'catmullrom',
        0.4,
    );
}

// ─── 幹の表面半径 ───

/**
 * 幹のパラメータ t における表面半径を返す (Trunk.tsx と同じ smoothstep テーパー)
 */
export function trunkRadiusAt(thickness: number, t: number): number {
    const topRadius = thickness * 0.01;
    const smooth = t * t * (3 - 2 * t);
    return thickness + (topRadius - thickness) * smooth;
}

// ─── 枝ジオメトリ (曲線チューブ) ───

const BRANCH_TUBE_SEGMENTS = 14;
const BRANCH_RADIAL_SEGMENTS = 7;
const BRANCH_TIP_RATIO = 0.02;
/** 根元の膨らみ倍率 (幹との接続部を自然に) */
const BRANCH_BASE_BULGE = 1.25;

/**
 * 枝の曲線パスを生成する
 *
 * 最初の区間は幹の表面から外向きに滑らかに立ち上がる "ステム" を持ち、
 * その後ゆるやかな弧を描いて先端に至る。
 * 4 制御点: 根元 → 外向きステム → 中間カーブ → 先端
 */
export function createBranchCurve(length: number, seed: number): THREE.CatmullRomCurve3 {
    const rng = seededRandom(seed + 7777);
    const swayX = length * (0.08 + rng() * 0.07) * (rng() > 0.5 ? 1 : -1);
    const swayZ = length * (0.04 + rng() * 0.05) * (rng() > 0.5 ? 1 : -1);

    // ステム: 根元から外向きに短く伸びる (長さの 12%)
    // ローカル +Y 方向 (= 回転後に幹から外向きになる)
    const stem = length * 0.12;

    // 先端に軽い上向きカーブ (生命感)
    const tipLift = length * 0.06;

    return new THREE.CatmullRomCurve3(
        [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, stem, 0),                                    // 外向きステム
            new THREE.Vector3(swayX, length * 0.5, swayZ),                    // 中間カーブ
            new THREE.Vector3(swayX * 0.3, length * 0.85, swayZ * 0.2),      // 先端手前
            new THREE.Vector3(swayX * 0.15, length + tipLift, swayZ * 0.1),  // 先端 (軽く上に反る)
        ],
        false,
        'catmullrom',
        0.5,
    );
}

/**
 * 枝のテーパー: パラメータ t (0=根元, 1=先端) における太さを返す
 * 根元には膨らみ (bulge) を付けて幹との接続を自然にする
 */
export function branchThicknessAt(baseThickness: number, t: number): number {
    const tipThickness = baseThickness * BRANCH_TIP_RATIO;

    // 根元の膨らみ: smoothstep で t=0→0.25 にかけて滑らかに減衰
    const bulgeT = Math.min(t / 0.25, 1);
    const bulgeSmooth = bulgeT * bulgeT * (3 - 2 * bulgeT); // smoothstep
    const bulge = BRANCH_BASE_BULGE + (1 - BRANCH_BASE_BULGE) * bulgeSmooth;
    const bulgedBase = baseThickness * bulge;

    const taper = Math.sqrt(t);
    return bulgedBase + (tipThickness - bulgedBase) * taper;
}

/**
 * 枝の曲線チューブジオメトリを生成する
 */
export function createBranchGeometry(
    length: number,
    baseThickness: number,
    seed: number,
): THREE.BufferGeometry {
    if (length <= 0) return new THREE.BufferGeometry();

    const curve = createBranchCurve(length, seed);

    const tube = new THREE.TubeGeometry(
        curve,
        BRANCH_TUBE_SEGMENTS,
        1,
        BRANCH_RADIAL_SEGMENTS,
        false,
    );
    const pos = tube.attributes.position;
    const stride = BRANCH_RADIAL_SEGMENTS + 1;

    for (let i = 0; i <= BRANCH_TUBE_SEGMENTS; i++) {
        const t = i / BRANCH_TUBE_SEGMENTS;
        const center = curve.getPointAt(t);
        const radius = branchThicknessAt(baseThickness, t);

        for (let j = 0; j <= BRANCH_RADIAL_SEGMENTS; j++) {
            const idx = i * stride + j;
            const ox = pos.getX(idx) - center.x;
            const oy = pos.getY(idx) - center.y;
            const oz = pos.getZ(idx) - center.z;
            pos.setXYZ(idx, center.x + ox * radius, center.y + oy * radius, center.z + oz * radius);
        }
    }

    // 最終リングを一点に収束 → 先端が自然に消える
    const tipPoint = curve.getPointAt(1);
    for (let j = 0; j <= BRANCH_RADIAL_SEGMENTS; j++) {
        const idx = BRANCH_TUBE_SEGMENTS * stride + j;
        pos.setXYZ(idx, tipPoint.x, tipPoint.y, tipPoint.z);
    }

    pos.needsUpdate = true;
    tube.computeVertexNormals();
    return tube;
}

// ─── 枝の配置 ───

const DEG_TO_RAD = Math.PI / 180;
const GOLDEN_ANGLE = 137.508; // 黄金角 (度)

/** 主枝の根元太さ (シルエットを形作る骨格) */
const BASE_THICKNESS = 0.11;
/** 階層ごとの太さ減衰率 (中枝・小枝は補助なので大きく減衰) */
const THICKNESS_DECAY = 0.4;

export type BranchTransform = {
    position: [number, number, number];
    rotation: [number, number, number];
    thickness: number;
};

/** 幹から生える主枝の上限 */
export const MAX_MAIN_BRANCHES = 4;
/** 幹から生える主枝の下限 */
export const MIN_MAIN_BRANCHES = 3;

/**
 * 枝の 3D 位置・回転・太さを計算する
 *
 * - 幹の S 字カーブに沿って配置
 * - 主枝は 3〜5 本に制限し、幹の 25〜90% の範囲に広く分布
 * - Y 軸回転は黄金角で螺旋状に分散
 * - seed による ±15° の角度揺らぎ
 * - 上に行くほど短い枝になるようスケール係数を返す
 */
export function computeBranchTransform(
    branch: Branch,
    trunkHeight: number,
    index: number,
    totalBranches: number,
    trunkThickness?: number,
): BranchTransform {
    const rng = seededRandom(branch.seed);
    const curve = createTrunkCurve(trunkHeight);

    // 主枝数を 3〜4 に制限
    const count = Math.min(Math.max(totalBranches, 1), MAX_MAIN_BRANCHES);
    const wrappedIndex = index % count;
    // 幹カーブ上のパラメータ t: 20%〜85% の範囲に広く均等分布
    // count+1 で割り、枝同士の間隔を十分に確保する
    const t = 0.20 + (wrappedIndex / (count + 1)) * 0.65;

    const point = curve.getPointAt(t);

    // Y 軸回転: 黄金角 × index + seed 揺らぎ (±15°)
    const yAngle = (GOLDEN_ANGLE * index) * DEG_TO_RAD + (rng() - 0.5) * 30 * DEG_TO_RAD;

    // 主枝 (depth 1) は横方向に大きく伸ばす: 60〜80°
    let branchAngle: number;
    if (branch.depth === 1) {
        branchAngle = (60 + rng() * 20) * DEG_TO_RAD;
    } else {
        branchAngle = Math.abs(branch.angle) * DEG_TO_RAD + (rng() - 0.5) * 10 * DEG_TO_RAD;
    }

    // depth に応じた太さ減衰 + 幹の半径で上限制限
    const rawThickness = BASE_THICKNESS * Math.pow(THICKNESS_DECAY, branch.depth - 1);
    const trunkR = trunkThickness ? trunkRadiusAt(trunkThickness, t) : 0;
    const maxThickness = trunkR > 0 ? trunkR * 0.7 : rawThickness;
    const thickness = Math.min(rawThickness, maxThickness);

    // ─── TubeGeometry と同じ parallel transport フレームを使う ───
    // Trunk.tsx の TUBE_SEGMENTS=32 と同じセグメント数でフレームを計算し、
    // t に最も近いセグメントのフレームを参照する
    const TRUNK_SEGMENTS = 32;
    const frames = curve.computeFrenetFrames(TRUNK_SEGMENTS, false);
    const segIdx = Math.round(t * TRUNK_SEGMENTS);
    const clampedIdx = Math.min(segIdx, TRUNK_SEGMENTS);
    const N = frames.normals[clampedIdx];
    const B = frames.binormals[clampedIdx];
    const T = frames.tangents[clampedIdx];

    // yAngle 方向の放射ベクトル (幹表面から外向き)
    const outward = new THREE.Vector3()
        .addScaledVector(N, Math.cos(yAngle))
        .addScaledVector(B, Math.sin(yAngle))
        .normalize();

    // 枝の方向: 外向き + 幹接線方向のブレンド
    const branchDir = new THREE.Vector3()
        .addScaledVector(outward, Math.sin(branchAngle))
        .addScaledVector(T, Math.cos(branchAngle))
        .normalize();

    // ローカル +Y を branchDir に向ける回転
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, branchDir);
    const euler = new THREE.Euler().setFromQuaternion(quat);

    // ─── 幹の表面に枝の原点をオフセット ───
    // 幹表面に接するよう trunkR の 30% にめり込ませる
    const offset = trunkR * 0.3;

    return {
        position: [
            point.x + outward.x * offset,
            point.y + outward.y * offset,
            point.z + outward.z * offset,
        ],
        rotation: [euler.x, euler.y, euler.z],
        thickness,
    };
}

/**
 * 上に行くほど枝を短くするスケール係数を返す
 * 最下部の枝で 1.0、最上部で 0.8 (主枝はシルエットを作るため長く保つ)
 */
export function branchLengthScale(index: number, totalBranches: number): number {
    const count = Math.min(Math.max(totalBranches, 1), MAX_MAIN_BRANCHES);
    const wrappedIndex = index % count;
    const t = wrappedIndex / Math.max(count - 1, 1);
    return 1.0 - t * 0.2;
}

// ─── サブブランチ生成 ───

export type SubBranch = {
    angle: number;
    length: number;
    depth: number;
    seed: number;
    /** 親枝の根元からの分岐位置 (0〜1) */
    attachT: number;
    /** Y 軸回転 */
    yRotation: number;
};

/**
 * 親枝から分岐するサブブランチを決定的に生成する
 *
 * 余白を残してシルエットの美しさを優先する。
 *
 * - depth 1 (主枝) → 中枝を 1〜2 本
 *   - 長さは主枝の 35〜50%
 *   - 枝の 40%〜75% の範囲に配置 (先端・根元付近は空ける)
 *   - 角度は左右交互 (20〜40°)
 * - depth 2 (中枝) → 小枝を 0〜1 本
 *   - 長さは中枝の 30〜45%
 * - depth 3 以上   → 分岐なし
 */
export function computeSubBranches(
    parentLength: number,
    parentDepth: number,
    seed: number,
): SubBranch[] {
    if (parentDepth >= 3) return [];

    const rng = seededRandom(seed + 3001);
    const childDepth = parentDepth + 1;

    // 本数: depth 1 → 2〜3 (幹寄りにも), depth 2 → 0〜1
    let count: number;
    if (parentDepth === 1) {
        count = 2 + Math.floor(rng() * 2); // 2〜3
    } else {
        count = Math.floor(rng() * 2); // 0〜1
    }
    if (count === 0) return [];

    const subs: SubBranch[] = [];
    for (let i = 0; i < count; i++) {
        // 分岐位置: 枝の 30%〜75% (幹寄りにも配置)
        const attachT = 0.30 + (i / Math.max(count, 1)) * 0.45 + rng() * 0.05;

        // 角度: 左右交互に 20〜40° (自然な分岐角)
        const sign = i % 2 === 0 ? 1 : -1;
        const angle = sign * (20 + rng() * 20);

        // 長さ: 中枝は主枝の 30〜40%, 小枝は中枝の 25〜35% (補助的)
        const minRatio = parentDepth === 1 ? 0.30 : 0.25;
        const rangeRatio = 0.10;
        const length = parentLength * (minRatio + rng() * rangeRatio);

        // Y 軸回転: 左右に広がるよう ±30〜90° の範囲 (真後ろを避ける)
        const yBase = (i % 2 === 0 ? 1 : -1) * (0.5 + rng() * 1.0);

        subs.push({
            angle,
            length,
            depth: childDepth,
            seed: seed + i * 997 + 5003,
            attachT,
            yRotation: yBase,
        });
    }

    return subs;
}

