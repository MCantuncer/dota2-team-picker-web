import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const status = { pending: false };
vi.mock("next/link", () => ({ useLinkStatus: () => status }));

import { HeaderOpening, NavPending } from "./nav-pending";

function Header({ bar }: { bar?: boolean }) {
  return (
    <header>
      <a href="/meta">
        Meta
        <NavPending bar={bar} />
      </a>
      <HeaderOpening />
    </header>
  );
}

describe("NavPending", () => {
  beforeEach(() => {
    status.pending = false;
  });

  it("shows nothing while no page is opening", () => {
    const { container } = render(<Header bar />);
    expect(container.querySelectorAll(".pending-sweep")).toHaveLength(0);
  });

  it("marks the clicked item and the header while its page opens", () => {
    status.pending = true;
    const { container } = render(<Header bar />);
    // One under the item, one along the header (shown on phones only).
    expect(container.querySelectorAll(".pending-sweep")).toHaveLength(2);
    expect(container.querySelector("a .pending-sweep")).not.toBeNull();
    expect(container.querySelector("header > .pending-sweep")?.className).toContain("sm:hidden");
  });

  it("from the phone's bottom bar, only the header sweep shows", () => {
    status.pending = true;
    const { container } = render(<Header />);
    expect(container.querySelector("a .pending-sweep")).toBeNull();
    expect(container.querySelector("header > .pending-sweep")).not.toBeNull();
  });

  it("clears the header sweep once the page has opened", () => {
    status.pending = true;
    const { container, rerender } = render(<Header />);
    status.pending = false;
    rerender(<Header />);
    expect(container.querySelector(".pending-sweep")).toBeNull();
  });
});
