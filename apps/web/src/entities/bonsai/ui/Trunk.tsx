import { memo, useMemo } from "react";
import * as THREE from "three";
import {
  createTrunkCurve,
  createBranchGeometry,
  createBranchCurve,
  seededRandom,
} from "../lib/bonsai-geometry";
import { FoliagePad } from "./FoliagePad";

type TrunkProps = {
  height: number;
  thickness: number;
  leafCount?: number;
  flowerCount?: number;
  leafColor?: string;
  flowerColor?: string;
  /** Branching Stage 以降で true → 幹先端に中枝を生やす */
  showTipBranches?: boolean;
};

const TRUNK_COLOR = "#8b6f4e";
const TUBE_SEGMENTS = 32;
const RADIAL_SEGMENTS = 10;

function createTrunkGeometry(height: number, thickness: number): THREE.BufferGeometry {
  if (height <= 0) return new THREE.BufferGeometry();

  const curve = createTrunkCurve(height);
  const tube = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, 1, RADIAL_SEGMENTS, false);
  const pos = tube.attributes.position;
  const stride = RADIAL_SEGMENTS + 1;

  for (let i = 0; i <= TUBE_SEGMENTS; i++) {
    const t = i / TUBE_SEGMENTS;
    const center = curve.getPointAt(t);
    const tipRadius = thickness * 0.01;
    const smooth = t * t * (3 - 2 * t);
    const radius = thickness + (tipRadius - thickness) * smooth;
    for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
      const idx = i * stride + j;
      const ox = pos.getX(idx) - center.x;
      const oy = pos.getY(idx) - center.y;
      const oz = pos.getZ(idx) - center.z;
      pos.setXYZ(idx, center.x + ox * radius, center.y + oy * radius, center.z + oz * radius);
    }
  }

  const tipPoint = curve.getPointAt(1);
  for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
    pos.setXYZ(TUBE_SEGMENTS * stride + j, tipPoint.x, tipPoint.y, tipPoint.z);
  }

  pos.needsUpdate = true;
  tube.computeVertexNormals();

  const verts = Array.from(pos.array);
  const norms = Array.from(tube.attributes.normal.array);
  const uvArr = Array.from(tube.attributes.uv.array);
  const idxArr = Array.from(tube.index!.array);

  const centerIdx = verts.length / 3;
  let avgX = 0,
    avgY = 0,
    avgZ = 0;
  for (let j = 0; j < RADIAL_SEGMENTS; j++) {
    avgX += verts[j * 3];
    avgY += verts[j * 3 + 1];
    avgZ += verts[j * 3 + 2];
  }
  avgX /= RADIAL_SEGMENTS;
  avgY /= RADIAL_SEGMENTS;
  avgZ /= RADIAL_SEGMENTS;
  verts.push(avgX, avgY, avgZ);
  norms.push(0, -1, 0);
  uvArr.push(0.5, 0.5);
  for (let j = 0; j < RADIAL_SEGMENTS; j++) {
    idxArr.push(centerIdx, (j + 1) % RADIAL_SEGMENTS, j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(norms, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvArr, 2));
  geo.setIndex(idxArr);
  return geo;
}

const BRANCH_COLOR = "#a08060";
const DEG_TO_RAD = Math.PI / 180;
/** 幹上の分岐位置を height に応じて算出（短い幹では手前に配置） */
function tipBranchT(height: number): number {
  return Math.min(0.8, 0.55 + height * 0.125);
}

type TipBranchTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
  thickness: number;
  seed: number;
};

/**
 * 幹の t=0.8 地点から生える中枝の配置を計算する
 * 幹の Frenet フレームから正しい方向に生やし、表面に配置
 */
function useTipBranchTransform(height: number, thickness: number): TipBranchTransform | null {
  return useMemo(() => {
    if (height <= 0) return null;
    const rng = seededRandom(44444);
    const curve = createTrunkCurve(height);
    const TRUNK_SEGMENTS = 32;
    const frames = curve.computeFrenetFrames(TRUNK_SEGMENTS, false);

    const t = tipBranchT(height);
    const point = curve.getPointAt(t);
    const segIdx = Math.round(t * TRUNK_SEGMENTS);
    const N = frames.normals[segIdx];
    const B = frames.binormals[segIdx];
    const T = frames.tangents[segIdx];

    // 放射方向
    const yAngle = rng() * Math.PI * 2;
    const outward = new THREE.Vector3()
      .addScaledVector(N, Math.cos(yAngle))
      .addScaledVector(B, Math.sin(yAngle))
      .normalize();

    // 枝の方向: やや横向き (50〜65°)
    const branchAngle = (50 + rng() * 15) * DEG_TO_RAD;
    const branchDir = new THREE.Vector3()
      .addScaledVector(outward, Math.sin(branchAngle))
      .addScaledVector(T, Math.cos(branchAngle))
      .normalize();

    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, branchDir);
    const euler = new THREE.Euler().setFromQuaternion(quat);

    // 幹表面にオフセット
    const topRadius = thickness * 0.01;
    const smooth = t * t * (3 - 2 * t);
    const trunkR = thickness + (topRadius - thickness) * smooth;

    return {
      position: [
        point.x + outward.x * trunkR * 0.5,
        point.y + outward.y * trunkR * 0.5,
        point.z + outward.z * trunkR * 0.5,
      ],
      rotation: [euler.x, euler.y, euler.z],
      length: height * (0.15 + rng() * 0.05),
      thickness: Math.min(0.04, trunkR * 0.7),
      seed: 44000,
    };
  }, [height, thickness]);
}

function TipBranch({
  transform,
  leafCount,
  flowerCount,
  leafColor,
  flowerColor,
}: {
  transform: TipBranchTransform;
  leafCount: number;
  flowerCount: number;
  leafColor: string;
  flowerColor: string;
}) {
  const geo = useMemo(
    () => createBranchGeometry(transform.length, transform.thickness, transform.seed),
    [transform.length, transform.thickness, transform.seed],
  );

  const tipPos = useMemo(() => {
    const curve = createBranchCurve(transform.length, transform.seed);
    const tip = curve.getPointAt(0.85);
    return [tip.x, tip.y, tip.z] as [number, number, number];
  }, [transform.length, transform.seed]);

  // パッド用の逆回転
  const counterRotation = useMemo(() => {
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(transform.rotation[0], transform.rotation[1], transform.rotation[2]),
    );
    q.invert();
    const e = new THREE.Euler().setFromQuaternion(q);
    return [e.x, e.y, e.z] as [number, number, number];
  }, [transform.rotation]);

  return (
    <group position={transform.position} rotation={transform.rotation}>
      <mesh geometry={geo}>
        <meshStandardMaterial color={BRANCH_COLOR} roughness={0.9} />
      </mesh>
      <group position={tipPos}>
        <FoliagePad
          leafCount={leafCount}
          flowerCount={flowerCount}
          leafColor={leafColor}
          flowerColor={flowerColor}
          seed={transform.seed + 20000}
          padRadius={Math.min(0.28, transform.length * 0.8)}
          counterRotation={counterRotation}
        />
      </group>
    </group>
  );
}

export const Trunk = memo(function Trunk({
  height,
  thickness,
  leafCount = 0,
  flowerCount = 0,
  leafColor = "#228B22",
  flowerColor = "#FFB7C5",
  showTipBranches = false,
}: TrunkProps) {
  const geometry = useMemo(() => createTrunkGeometry(height, thickness), [height, thickness]);

  const tipTransform = useMemo(() => {
    if (height <= 0) return null;
    const curve = createTrunkCurve(height);
    const tipT = Math.min(1.0, 0.75 + height * 0.125);
    const tipPoint = curve.getPointAt(tipT);
    const tangent = curve.getTangentAt(tipT).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    quat.invert();
    const euler = new THREE.Euler().setFromQuaternion(quat);
    return {
      position: [tipPoint.x, tipPoint.y, tipPoint.z] as [number, number, number],
      counterRotation: [euler.x, euler.y, euler.z] as [number, number, number],
    };
  }, [height]);

  const tipBranch = useTipBranchTransform(height, thickness);

  // 幹先端 (主枝) パッドに 60%、分岐中枝に 40% を配分
  const mainLeaves = Math.ceil(leafCount * 0.6);
  const mainFlowers = Math.ceil(flowerCount * 0.6);
  const branchLeaves = leafCount - mainLeaves;
  const branchFlowers = flowerCount - mainFlowers;

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={TRUNK_COLOR} roughness={0.9} />
      </mesh>
      {tipTransform && (
        <group position={tipTransform.position}>
          {/* 幹先端のメインパッド */}
          {(mainLeaves > 0 || mainFlowers > 0) && (
            <FoliagePad
              leafCount={mainLeaves}
              flowerCount={mainFlowers}
              leafColor={leafColor}
              flowerColor={flowerColor}
              seed={42000}
              padRadius={Math.min(0.28, height * 0.2)}
              counterRotation={tipTransform.counterRotation}
            />
          )}
        </group>
      )}
      {/* 幹の t=0.8 地点から分岐する中枝 (Branching Stage 以降) */}
      {showTipBranches && tipBranch && (
        <TipBranch
          transform={tipBranch}
          leafCount={branchLeaves}
          flowerCount={branchFlowers}
          leafColor={leafColor}
          flowerColor={flowerColor}
        />
      )}
    </group>
  );
});
