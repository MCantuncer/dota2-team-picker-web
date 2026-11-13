import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageTour } from "./page-tour";

// jsdom lays nothing out, so every marked control gets a box unless it is marked hidden.
function sized(this: Element) {
  const hidden = this.closest("[data-off]");
  const size = hidden ? 0 : 40;
  return { top: 100, left: 100, width: size * 4, height: size, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
}

function Page() {
  return (
    <>
      <PageTour tour="draft" />
      <div data-tour="draft-role">
        <button type="button">Mid</button>
      </div>
      <div data-tour="draft-plan">Plan For</div>
      <input aria-label="Enemy pick" data-tour="draft-enemy" />
      <div data-off="">
        <button type="button" data-tour="draft-watch">
          Watch Dota
        </button>
      </div>
      <div data-tour="draft-bans">Bans</div>
    </>
  );
}

// The tour follows its control frame by frame; one tip on screen means the first frame ran.
const frames = () => waitFor(() => expect(document.querySelector(".tour-ring")).not.toBeNull());

describe("PageTour", () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(sized);
    window.scrollTo = vi.fn() as typeof window.scrollTo;
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks an unseen tour with a dot until it is opened once", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<Page />);
    expect(container.querySelector(".tour-dot")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Page Tour" }));
    expect(container.querySelector(".tour-dot")).toBeNull();
    unmount();
    const again = render(<Page />);
    expect(again.container.querySelector(".tour-dot")).toBeNull();
  });

  it("counts only the steps whose control is on screen, and walks them with Next and Back", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: "Page Tour" }));
    await frames();
    const tip = screen.getByRole("dialog", { name: "Your Role" });
    expect(tip).toHaveTextContent("1 of 4");
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();

    await user.click(await screen.findByRole("button", { name: "Next" }));
    await frames();
    expect(screen.getByRole("dialog", { name: "Who to Plan For" })).toHaveTextContent("2 of 4");
    await user.click(await screen.findByRole("button", { name: "Next" }));
    await user.click(await screen.findByRole("button", { name: "Next" }));
    await frames();
    // Watch Dota is hidden here, so Bans comes straight after the enemy box.
    expect(screen.getByRole("dialog", { name: "Add Bans" })).toHaveTextContent("4 of 4");
    await user.click(await screen.findByRole("button", { name: "Back" }));
    await frames();
    expect(screen.getByRole("dialog", { name: "Add Enemy Heroes" })).toBeInTheDocument();
  });

  it("moves on when the lit control is used, and closes with Done or Escape", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: "Page Tour" }));
    await frames();
    await user.click(screen.getByRole("button", { name: "Mid" }));
    expect(await screen.findByRole("dialog", { name: "Who to Plan For" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Page Tour" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Page Tour" }));
    await frames();
    for (let i = 0; i < 3; i++) await user.click(await screen.findByRole("button", { name: "Next" }));
    await user.click(await screen.findByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("leaves arrow keys to a text box the player is typing in", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: "Page Tour" }));
    await frames();
    await user.click(screen.getByLabelText("Enemy pick"));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Your Role" })).toBeInTheDocument();
  });
});
