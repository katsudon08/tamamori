import { Html } from "@react-three/drei";
import { Link } from "@tanstack/react-router";

type GardenBonsaiLabelProps = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  position: [number, number, number];
};

/** Html 内部のコンテンツ (テスト用にエクスポート) */
export function GardenBonsaiLabelContent({
  userId,
  displayName,
  avatarUrl,
}: Omit<GardenBonsaiLabelProps, "position">) {
  return (
    <Link to="/bonsai/$userId" params={{ userId }} className="flex items-center gap-1 no-underline">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          width={16}
          height={16}
          className="h-4 w-4 rounded-full"
        />
      ) : (
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-300 text-[8px]">
          {displayName.charAt(0)}
        </div>
      )}
      <span className="whitespace-nowrap text-[10px] leading-none text-gray-700">
        {displayName}
      </span>
    </Link>
  );
}

export function GardenBonsaiLabel({
  userId,
  displayName,
  avatarUrl,
  position,
}: GardenBonsaiLabelProps) {
  return (
    <Html position={position} center distanceFactor={8} zIndexRange={[1, 0]}>
      <GardenBonsaiLabelContent userId={userId} displayName={displayName} avatarUrl={avatarUrl} />
    </Html>
  );
}
