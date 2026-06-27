import { type Variant, skeletonStyles } from "./variants";

type SkeletonProps = {
  variant?: Variant;
  className?: string;
  shape?: "rect" | "circle";
  animate?: boolean;
};

export function Skeleton({
  variant = "tamamori",
  className,
  shape = "rect",
  animate = true,
}: SkeletonProps) {
  const styles = skeletonStyles[variant];
  const radius = shape === "circle" ? "rounded-full" : "rounded-md";

  return (
    <div
      role="status"
      aria-label="読み込み中"
      className={`${styles.base} ${radius} ${animate ? "animate-pulse" : ""} ${className ?? ""}`}
    />
  );
}
