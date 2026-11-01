import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Announcer, picksSentence, SETTLE_MS } from "./announcer";

const region = (c: HTMLElement) => c.querySelector("[aria-live]")!.textContent;

describe("Announcer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stays silent on the list the page opens with, even if it loads late", () => {
    const { container, rerender } = render(<Announcer text="" />);
    rerender(<Announcer text="A" />);
    act(() => vi.advanceTimersByTime(SETTLE_MS * 2));
    expect(region(container)).toBe("");
  });

  it("announces a batch of changes once, after the list settles", () => {
    const { container, rerender } = render(<Announcer text="A" />);
    rerender(<Announcer text="B" />);
    act(() => vi.advanceTimersByTime(SETTLE_MS / 2));
    rerender(<Announcer text="C" />);
    act(() => vi.advanceTimersByTime(SETTLE_MS - 1));
    expect(region(container)).toBe("");
    act(() => vi.advanceTimersByTime(1));
    expect(region(container)).toBe("C");
  });

  it("announces an Undo back to the opening list", () => {
    const { container, rerender } = render(<Announcer text="A" />);
    rerender(<Announcer text="B" />);
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    rerender(<Announcer text="A" />);
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    expect(region(container)).toBe("A");
  });

  it("reads the same sentence again when the list goes away and comes back", () => {
    const { container, rerender } = render(<Announcer text="A" />);
    rerender(<Announcer text="B" />);
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    rerender(<Announcer text="" />);
    rerender(<Announcer text="B" />);
    act(() => vi.advanceTimersByTime(SETTLE_MS));
    expect(region(container)).toBe("B ");
  });
});

describe("picksSentence", () => {
  it("names the best pick and the next two", () => {
    expect(picksSentence(["Sven", "Slark", "Luna", "Ursa"])).toBe("Picks updated. Best: Sven, then Slark and Luna.");
    expect(picksSentence(["Sven", "Slark"])).toBe("Picks updated. Best: Sven, then Slark.");
    expect(picksSentence(["Sven"])).toBe("Picks updated. Best: Sven.");
    expect(picksSentence([])).toBe("");
  });
});
