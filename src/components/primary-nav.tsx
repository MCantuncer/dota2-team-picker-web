"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icon";

export interface NavItem {
  href: string;
  label: string;
  icon?: IconName;
  /** Things waiting there, such as friend requests; shown as a count. */
  badge?: number;
}

/** The count after a nav label. */
export function NavBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="ml-1.5 rounded-full bg-accent px-1.5 py-px text-xs font-semibold tabular-nums text-on-accent">
      {count}
      <span className="sr-only"> waiting</span>
    </span>
  );
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
      <ul className="flex h-full items-stretch gap-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="relative flex items-center">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-[0.9375rem] transition-colors ${
                  active ? "bg-raised text-fg" : "text-muted hover:bg-surface hover:text-fg"
                }`}
              >
                {item.icon && (
                  <span className={active ? "text-accent" : "text-subtle"}>
                    <Icon name={item.icon} />
                  </span>
                )}
                <span className="hidden lg:inline">{item.label}</span>
                <span className="sr-only lg:hidden">{item.label}</span>
                <NavBadge count={item.badge} />
              </Link>
              {active && <span aria-hidden className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
