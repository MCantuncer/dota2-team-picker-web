import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const at = { pathname: "/" };
vi.mock("next/navigation", () => ({ usePathname: () => at.pathname }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

import { PrimaryNav } from "./primary-nav";
import { SectionDock } from "./section-dock";
import { SectionRow } from "./section-row";

const NONE = { friends: 0, stacks: 0 };
const names = (links: HTMLElement[]) => links.map((link) => link.textContent);

beforeEach(() => {
  at.pathname = "/";
});

describe.each([
  ["PrimaryNav", PrimaryNav],
  ["SectionDock", SectionDock],
])("%s", (_, Nav) => {
  it("lists the four sections, each opening its first page", () => {
    render(<Nav waiting={NONE} />);
    const links = within(screen.getByRole("navigation", { name: "Main" })).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/draft", "/my-heroes", "/meta", "/friends"]);
    expect(names(links)).toEqual(["Draft", "You", "Meta", "Team"]);
    expect(links.filter((link) => link.hasAttribute("aria-current"))).toEqual([]);
  });

  it("lights the section on its first page and on its other pages", () => {
    at.pathname = "/my-heroes";
    const { unmount } = render(<Nav waiting={NONE} />);
    expect(screen.getByRole("link", { name: "You" })).toHaveAttribute("aria-current", "page");
    unmount();
    at.pathname = "/profile";
    render(<Nav waiting={NONE} />);
    // Lit, but the link leads to Heroes, so it is not the page you are on.
    expect(screen.getByRole("link", { name: "You" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Meta" })).not.toHaveAttribute("aria-current");
  });

  it("counts on Team what waits in Friends and Stacks together", () => {
    render(<Nav waiting={{ friends: 1, stacks: 2 }} />);
    expect(screen.getByRole("link", { name: /^Team ?3 ?waiting$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "You" })).toBeInTheDocument();
  });
});

describe("SectionRow", () => {
  it("lists the open section's pages and marks the one you are on", () => {
    at.pathname = "/my-heroes/games/8123456789";
    render(<SectionRow />);
    const links = within(screen.getByRole("navigation", { name: "You" })).getAllByRole("link");
    expect(names(links)).toEqual(["Heroes", "Games", "Profile"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/my-heroes", "/my-heroes/games", "/profile"]);
    expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([null, "page", null]);
  });

  it("shows a page's count where the page is", () => {
    at.pathname = "/friends";
    render(<SectionRow badges={{ stacks: <span>2 waiting</span> }} />);
    const links = within(screen.getByRole("navigation", { name: "Team" })).getAllByRole("link");
    expect(names(links)).toEqual(["Friends", "Stacks2 waiting"]);
  });

  it("shows no row on Draft, which has one page, or outside the sections", () => {
    at.pathname = "/draft";
    const { container, rerender } = render(<SectionRow />);
    expect(container).toBeEmptyDOMElement();
    at.pathname = "/reports/abc";
    rerender(<SectionRow />);
    expect(container).toBeEmptyDOMElement();
    at.pathname = "/";
    rerender(<SectionRow />);
    expect(container).toBeEmptyDOMElement();
  });
});
