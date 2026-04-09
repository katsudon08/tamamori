import { type Variant, progressBarStyles } from './variants';

type ProgressBarProps = {
    current: number;
    target: number;
    variant?: Variant;
    className?: string;
};

export function ProgressBar({ current, target, variant = 'tamamori', className }: ProgressBarProps) {
    const percent = target <= 0 ? 0 : Math.min(Math.max((current / target) * 100, 0), 100);
    const rounded = Math.round(percent);
    const styles = progressBarStyles[variant];

    return (
        <div className={className} role="progressbar" aria-valuenow={rounded} aria-valuemin={0} aria-valuemax={100}>
            <div className={`flex items-center justify-between text-sm mb-1 ${styles.text}`}>
                <span>
                    {current} / {target}
                </span>
                <span>{rounded}%</span>
            </div>
            <div className={`h-3 w-full rounded-md ${styles.track}`}>
                <div
                    className={`h-full rounded-md transition-all duration-300 ${styles.fill}`}
                    style={{ width: `${rounded}%` }}
                />
            </div>
        </div>
    );
}
