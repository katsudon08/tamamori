import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { type Variant, navLinkStyles } from "./variants";

type NavLinkProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  matchPaths?: string[];
};

export function NavLink({ href, children, variant = "tamamori", matchPaths }: NavLinkProps) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const paths = [href, ...(matchPaths ?? [])];
  const isActive = paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const styles = navLinkStyles[variant];

  return (
    <Link
      to={href}
      aria-current={isActive ? "page" : undefined}
      className={isActive ? styles.active : styles.inactive}
    >
      {children}
    </Link>
  );
}
