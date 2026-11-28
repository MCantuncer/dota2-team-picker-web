"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import { NavPending } from "./nav-pending";
import { placeOf, SECTIONS, waitingIn, type Waiting } from "./sections";

/**
 * Phones: the four sections in a bar at the bottom of the screen, under the thumb. It takes the place of the top
 * bar's sections, which need more width than a phone has. The page keeps room for it (`--dock` in globals.css),
 * and the cards that sit at the bottom of the screen rest on top of it.
 */
export function SectionDock({ waiting }: { waiting: Waiting }) {
  const here = placeOf(usePathname());

  return (
    <nav aria-label="Main" className="section-dock fixed inset-x-0 bottom-0 z-40 border-t border-line-strong bg-surface sm:hidden">
      <ul className="grid h-15 grid-cols-4">
        {SECTIONS.map((section) => {
          const active = here?.section === section;
          const count = waitingIn(section, waiting);
          return (
            <li key={section.key} className="relative flex">
              <Link
                href={section.href}
                aria-current={active ? (here?.page?.href === section.href ? "page" : "true") : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs ${active ? "font-semibold text-fg" : "font-medium text-muted"}`}
              >
                <span className={`relative ${active ? "text-accent" : "text-muted"}`}>
                  <Icon name={section.icon} large />
                  {count > 0 && (
                    <span aria-hidden className="absolute -right-3 -top-1.5 rounded-md bg-accent px-1 text-xs font-semibold tabular-nums leading-4 text-on-accent">
                      {count}
                    </span>
                  )}
                </span>
                {section.label}
                {count > 0 && <span className="sr-only"> {count} waiting</span>}
                <NavPending />
              </Link>
              {active && <span aria-hidden className="absolute inset-x-[22%] -top-px h-0.5 bg-accent" />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
