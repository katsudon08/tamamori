import { AlertTriangle } from "lucide-react";

import { type Variant, errorFallbackStyles } from "./variants";

type ErrorFallbackProps = {
  variant?: Variant;
  className?: string;
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorFallback({
  variant = "tamamori",
  className,
  title = "エラーが発生しました",
  message = "データの取得に失敗しました",
  onRetry,
}: ErrorFallbackProps) {
  const styles = errorFallbackStyles[variant];

  return (
    <div
      role="alert"
      data-testid="error-fallback"
      className={`flex flex-col items-center justify-center gap-3 py-12 ${className ?? ""}`}
    >
      <AlertTriangle size={32} className={styles.title} aria-hidden="true" />
      <h3 className={`text-lg font-semibold ${styles.title}`}>{title}</h3>
      <p className={`text-sm ${styles.message}`}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`mt-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${styles.button}`}
        >
          再試行
        </button>
      )}
    </div>
  );
}
