'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { type Variant, navLinkStyles } from './variants';

type NavLinkProps = {
    href: string;
    children: ReactNode;
    variant?: Variant;
    matchPaths?: string[];
};

export function NavLink({ href, children, variant = 'tamamori', matchPaths }: NavLinkProps) {
    const pathname = usePathname() ?? '';
    const paths = [href, ...(matchPaths ?? [])];
    const isActive = paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const styles = navLinkStyles[variant];

    return (
        <Link
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? styles.active : styles.inactive}
        >
            {children}
        </Link>
    );
}
