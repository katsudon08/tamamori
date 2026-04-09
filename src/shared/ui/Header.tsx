import type { ReactNode } from 'react';
import { type Variant, headerStyles } from './variants';

type HeaderProps = {
    children?: ReactNode;
    rightSlot?: ReactNode;
    variant?: Variant;
};

export function Header({ children, rightSlot, variant = 'tamamori' }: HeaderProps) {
    const styles = headerStyles[variant];

    return (
        <header className={`flex items-center justify-between px-8 py-5 ${styles.header}`}>
            <div className="flex items-center gap-8">
                <span className={styles.title}>
                    たま森
                </span>
                <nav className={`flex items-center gap-6 ${styles.nav}`}>
                    {children}
                </nav>
            </div>
            {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
        </header>
    );
}
