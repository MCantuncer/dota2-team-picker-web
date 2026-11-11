import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BanSlot, EmptySlots, Rail, RailSlot } from "./draft-rails";
import { PositionPicker } from "./position-picker";

describe("Rail", () => {
  it("shows a team's picks, then open slots up to five, with full names and positions", async () => {
    const onRemove = vi.fn();
    render(
      <Rail title="Enemy" count="2/5" side="dire" isSideKnown>
        <RailSlot name="Legion Commander" portrait="/lc.png" side="dire" onRemove={onRemove}>
          <PositionPicker heroName="Legion Commander" position={3} isGuess={false} onChange={vi.fn()} />
        </RailSlot>
        <RailSlot name="Shadow Fiend" portrait="/sf.png" side="dire" by="You">
          <PositionPicker heroName="Shadow Fiend" position={2} isGuess onChange={vi.fn()} />
        </RailSlot>
        <EmptySlots filled={2} />
      </Rail>,
    );
    const rail = screen.getByRole("region", { name: "Enemy" });
    expect(within(rail).getByRole("heading")).toHaveTextContent("Enemy 2/5 Dire");
    expect(within(rail).getAllByRole("listitem", { hidden: true })).toHaveLength(5);
    expect(within(rail).getByText("Legion Commander")).toBeInTheDocument();
    expect(within(rail).getByText("Entered by You")).toBeInTheDocument();
    expect(within(rail).getByRole("radio", { name: "Pos 2, Mid, guessed. Click to confirm" })).toHaveAttribute(
      "data-guess",
    );
    await userEvent.click(within(rail).getByRole("button", { name: "Remove Legion Commander" }));
    expect(onRemove).toHaveBeenCalled();
    expect(within(rail).queryByRole("button", { name: "Remove Shadow Fiend" })).not.toBeInTheDocument();
  });

  it("draws no open slot once a team is full", () => {
    render(
      <ul>
        <EmptySlots filled={5} />
      </ul>,
    );
    expect(screen.queryAllByRole("listitem", { hidden: true })).toHaveLength(0);
  });
});

describe("BanSlot", () => {
  it("takes the ban back in one click, and only shows it to a player who can't change the draft", async () => {
    const onUnban = vi.fn();
    const { rerender } = render(
      <ul>
        <BanSlot name="Anti-Mage" portrait="/am.png" onUnban={onUnban} />
      </ul>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Unban Anti-Mage" }));
    expect(onUnban).toHaveBeenCalled();
    rerender(
      <ul>
        <BanSlot name="Anti-Mage" />
      </ul>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getAllByText("Anti-Mage").length).toBeGreaterThan(0);
  });
});
