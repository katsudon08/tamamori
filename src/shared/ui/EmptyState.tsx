import type { ReactNode } from 'react';

import { type Variant, emptyStateStyles } from './variants';

type EmptyStateProps = {
    variant?: Variant;
    className?: string;
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
};

export function EmptyState({
    variant = 'tamamori',
    className,
    icon,
    title,
    description,
    action,
}: EmptyStateProps) {
    const styles = emptyStateStyles[variant];

    return (
        <div
            data-testid="empty-state"
            className={`flex flex-col items-center justify-center gap-3 py-12 ${className ?? ''}`}
        >
            {icon && <div className="text-4xl">{icon}</div>}
            <h3 className={`text-lg font-semibold ${styles.title}`}>{title}</h3>
            {description && <p className={`text-sm ${styles.description}`}>{description}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
