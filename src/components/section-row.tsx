"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavPending } from "./nav-pending";
import { placeOf, type Waiting } from "./sections";

/**
 * The Section Row: the pages of the section that is open, in one slim row under the top bar. It is one click to
 * any page of the section and always says where you are. It scrolls away with the page; only the top bar stays.
 * A section with one page (Draft) and pages outside the sections show no row.
 *
 * `badges` are the counts to show after a page's name, by what waits there. They arrive on their own, so the row
 * never waits for them.
 */
export function SectionRow({ badges = {} }: { badges?: Partial<Record<keyof Waiting, ReactNode>> }) {
  const here = placeOf(usePathname());
  if (!here || here.section.pages.length < 2) return null;

  return (
    <nav aria-label={here.section.label} className="border-b border-line bg-bg">
      <ul className="page flex h-11 items-stretch gap-7">
        {here.section.pages.map((page) => {
          const current = here.page === page;
          return (
            <li key={page.href} className="relative flex">
              <Link
                href={page.href}
                aria-current={current ? "page" : undefined}
                className={`flex items-center whitespace-nowrap rounded-md text-sm transition-colors ${
                  current ? "font-semibold text-fg" : "font-medium text-muted hover:text-fg"
                }`}
              >
                {page.label}
                {page.waiting && badges[page.waiting]}
                {!current && <NavPending bar />}
              </Link>
              {current && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
