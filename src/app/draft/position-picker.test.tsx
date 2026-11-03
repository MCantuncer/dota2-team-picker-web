import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PositionPicker } from "./position-picker";

describe("PositionPicker", () => {
  it("chooses any position in one click", async () => {
    const onChange = vi.fn();
    render(<PositionPicker heroName="Lion" position={5} isGuess={false} onChange={onChange} />);

    expect(screen.getByRole("radio", { name: "Pos 5, Hard support, chosen" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Pos 4, Soft support" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("confirms a guess and hands a choice back to the guess", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<PositionPicker heroName="Lion" position={5} isGuess onChange={onChange} />);
    const guess = screen.getByRole("radio", { name: "Pos 5, Hard support, guessed. Click to confirm" });

    expect(guess).not.toBeChecked();
    expect(guess).toHaveAttribute("data-guess");
    await userEvent.click(guess);
    expect(onChange).toHaveBeenLastCalledWith(5);

    rerender(<PositionPicker heroName="Lion" position={5} isGuess={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "Pos 5, Hard support, chosen" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("is one Tab stop that the arrows, digits and Delete drive", async () => {
    const onChange = vi.fn();
    render(<PositionPicker heroName="Lion" position={5} isGuess={false} onChange={onChange} />);

    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Pos 5, Hard support, chosen" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(1);
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith(4);
    await userEvent.keyboard("3");
    expect(onChange).toHaveBeenLastCalledWith(3);
    await userEvent.keyboard("{Delete}");
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("only shows the position to players who can't change the draft", () => {
    render(<PositionPicker heroName="Lion" position={2} isGuess={false} />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
  });
});
