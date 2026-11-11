import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BanFace, BanLine, EmptySlots, Rail, RailSlot } from "./draft-rails";
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

describe("BanLine", () => {
  it("lists every ban on one line under its title and count, with the box", () => {
    render(
      <BanLine count={3} headingId="bans-title" input={<input aria-label="Bans" />}>
        <BanFace name="Anti-Mage" portrait="/am.png" />
        <BanFace name="Shadow Fiend" portrait="/sf.png" />
        <BanFace name="Phantom Assassin" />
      </BanLine>,
    );
    const line = screen.getByRole("region", { name: "Bans 3" });
    expect(within(line).getByRole("textbox", { name: "Bans" })).toBeInTheDocument();
    expect(within(line).getAllByRole("listitem")).toHaveLength(3);
    // A hero with no art keeps its name in view.
    expect(within(line).getAllByText("Phantom Assassin").length).toBeGreaterThan(0);
  });

  it("leaves the box out for a player who can't change the draft", () => {
    render(
      <BanLine count={0} headingId="bans-title">
        {null}
      </BanLine>,
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("BanFace", () => {
  it("takes the ban back in one click, and only shows it to a player who can't change the draft", async () => {
    const onUnban = vi.fn();
    const { rerender } = render(
      <ul>
        <BanFace name="Anti-Mage" portrait="/am.png" onUnban={onUnban} />
      </ul>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Unban Anti-Mage" }));
    expect(onUnban).toHaveBeenCalled();
    rerender(
      <ul>
        <BanFace name="Anti-Mage" portrait="/am.png" />
      </ul>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Anti-Mage")).toBeInTheDocument();
  });
});
