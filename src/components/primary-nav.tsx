"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

/** True when `pathname` is `href` or a page under it. */
export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The main sections, shown inline from tablet width up. On phones they live in the account menu. */
export function PrimaryNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  if (!items.length) return null;

  return (
    <nav aria-label="Main" className="hidden h-full sm:block">
      <ul className="flex h-full items-stretch gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="relative flex items-center">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 font-heading text-[0.9375rem] font-semibold uppercase tracking-wider transition-colors ${
                  active ? "text-fg" : "text-muted hover:bg-raised hover:text-fg"
                }`}
              >
                {item.label}
              </Link>
              {active && <span aria-hidden className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
