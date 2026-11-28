import type { IconName } from "./icon";

/** One page of a section, as the Section Row names it. */
export interface SectionPage {
  href: string;
  label: string;
  /** What counts toward the page's badge: friend requests, or Stack invites and join requests. */
  waiting?: keyof Waiting;
}

/** One of the four places in the top bar. Its link opens its first page. */
export interface Section {
  key: "draft" | "you" | "meta" | "team";
  label: string;
  icon: IconName;
  href: string;
  /** The section's pages, in the order the Section Row shows them. One page means no row. */
  pages: SectionPage[];
  /** Other addresses that belong to the section without being a page in its row. */
  also?: string[];
}

/** Things waiting for the player, shown as counts on Team and on its pages. */
export interface Waiting {
  friends: number;
  stacks: number;
}

/**
 * The site's four sections. The top bar and the phone's bottom bar list them; the Section Row under the top bar
 * lists the pages of the one that is open. See docs/design-system.md, "Sections".
 */
export const SECTIONS: Section[] = [
  { key: "draft", label: "Draft", icon: "swords", href: "/draft", pages: [{ href: "/draft", label: "Draft" }], also: ["/reports"] },
  {
    key: "you",
    label: "You",
    icon: "helmet",
    href: "/my-heroes",
    pages: [
      { href: "/my-heroes", label: "Heroes" },
      { href: "/my-heroes/games", label: "Games" },
      { href: "/profile", label: "Profile" },
    ],
  },
  {
    key: "meta",
    label: "Meta",
    icon: "chart",
    href: "/meta",
    pages: [
      { href: "/meta", label: "This Patch" },
      { href: "/proof", label: "Do Our Picks Win?" },
    ],
  },
  {
    key: "team",
    label: "Team",
    icon: "users",
    href: "/friends",
    pages: [
      { href: "/friends", label: "Friends", waiting: "friends" },
      { href: "/stacks", label: "Stacks", waiting: "stacks" },
    ],
  },
];

/** True when `pathname` is `href` or a page under it. */
export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Where `pathname` sits: its section, and the page of that section it is or lies under (Your Games for one game,
 * not Heroes, though both addresses start the same). Null on pages outside the sections, such as Home or Sign In.
 */
export function placeOf(pathname: string): { section: Section; page: SectionPage | null } | null {
  let best: { section: Section; page: SectionPage } | null = null;
  for (const section of SECTIONS) {
    for (const page of section.pages) {
      if (isActive(pathname, page.href) && (!best || page.href.length > best.page.href.length)) best = { section, page };
    }
  }
  if (best) return best;
  const section = SECTIONS.find((s) => s.also?.some((href) => isActive(pathname, href)));
  return section ? { section, page: null } : null;
}

/** How many things wait in a section: the sum over its pages. */
export function waitingIn(section: Section, waiting: Waiting): number {
  return section.pages.reduce((sum, page) => sum + (page.waiting ? waiting[page.waiting] : 0), 0);
}
