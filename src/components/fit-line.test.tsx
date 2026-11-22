import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FitLine } from "./fit-line";

/** jsdom has no layout: the text is as wide as its font size times its letters, in a column `column` pixels wide. */
function layout(column: number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(column);
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
    return (parseFloat(this.style.fontSize) || 0) * (this.textContent?.length ?? 0) * 0.5;
  });
}

afterEach(() => vi.restoreAllMocks());

describe("FitLine", () => {
  it("keeps a short name at full size on one line", () => {
    layout(300);
    render(<FitLine max={15} min={11}>+125 Blink Cast Range</FitLine>);
    expect(screen.getByText("+125 Blink Cast Range")).toHaveStyle({ fontSize: "15px", whiteSpace: "nowrap" });
  });

  it("shrinks a long name until it fits on one line", () => {
    layout(300);
    // 49 letters: 15px needs 367px, 12px needs 294px.
    render(<FitLine max={15} min={11}>+25% Counterspell Reflected Spell Debuff Duration</FitLine>);
    expect(screen.getByText(/Counterspell/)).toHaveStyle({ fontSize: "12px", whiteSpace: "nowrap" });
  });

  it("wraps at full size when even the smallest size doesn't fit", () => {
    layout(135);
    render(<FitLine max={15} min={11}>+25% Counterspell Reflected Spell Debuff Duration</FitLine>);
    expect(screen.getByText(/Counterspell/)).toHaveStyle({ fontSize: "15px", whiteSpace: "normal" });
  });

  it("wraps at the given size when one is given", () => {
    layout(135);
    render(
      <FitLine max={15} min={11} wrap={13}>
        +25% Counterspell Reflected Spell Debuff Duration
      </FitLine>,
    );
    expect(screen.getByText(/Counterspell/)).toHaveStyle({ fontSize: "13px", whiteSpace: "normal" });
  });
});
