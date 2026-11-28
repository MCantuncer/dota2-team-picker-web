"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import { NavPending } from "./nav-pending";
import { placeOf, SECTIONS, waitingIn, type Waiting } from "./sections";

/** The count after a nav label. */
export function NavBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="ml-1.5 rounded-md bg-accent px-1.5 py-px text-xs font-semibold tabular-nums text-on-accent">
      {count}
      <span className="sr-only"> waiting</span>
    </span>
  );
}

/**
 * The four sections in the top bar, from tablet width up. A section opens its first page and stays lit on all of
 * its pages; the Section Row under the bar says which one is open. On phones the sections sit in the bottom bar.
 */
export function PrimaryNav({ waiting }: { waiting: Waiting }) {
  const here = placeOf(usePathname());

  return (
    <nav aria-label="Main" className="hidden h-full sm:block">
      <ul className="flex h-full items-stretch gap-0.5">
        {SECTIONS.map((section) => {
          const active = here?.section === section;
          return (
            <li key={section.key} className="relative flex items-center">
              <Link
                href={section.href}
                aria-current={active ? (here?.page?.href === section.href ? "page" : "true") : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-base transition-colors ${
                  active ? "bg-raised text-fg" : "text-muted hover:bg-surface hover:text-fg"
                }`}
              >
                <span className={active ? "text-accent" : "text-muted"}>
                  <Icon name={section.icon} />
                </span>
                <span className="max-lg:sr-only">{section.label}</span>
                <NavBadge count={waitingIn(section, waiting)} />
                {!active && <NavPending bar />}
              </Link>
              {active && <span aria-hidden className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
