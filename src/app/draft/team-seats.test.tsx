import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SOLO_ME } from "@/lib/solo-queue";
import type { Seat, TeamPerson } from "@/lib/team-lineup";
import { TeamSeats } from "./team-seats";

const person = (id: string, name: string, more: Partial<TeamPerson> = {}): TeamPerson => ({
  id,
  name,
  avatarUrl: null,
  positions: [],
  stacks: [],
  isFriend: false,
  shared: true,
  canAdd: true,
  ...more,
});

const people = [
  person("a", "Ana", { positions: [1], stacks: [{ id: "s1", name: "Night Shift", joinedAt: "1", role: "player" }] }),
  person("b", "Bo", { isFriend: true, positions: [4] }),
  person("c", "Cy", { isFriend: true, shared: false }),
  person("o", "Oz", { canAdd: false, shared: false, stacks: [{ id: "s1", name: "Night Shift", joinedAt: "0", role: "owner" }] }),
];

function setup(seats: Seat[], more: Partial<Parameters<typeof TeamSeats>[0]> = {}) {
  const calls = { place: vi.fn(), remove: vi.fn(), fill: vi.fn() };
  render(
    <TeamSeats
      mode="team"
      seats={seats}
      people={people}
      stacks={[{ id: "s1", name: "Night Shift" }]}
      signedIn
      notice={null}
      hero={(id) => ({ name: `Hero ${id}`, image: `/hero-${id}.png` })}
      onPlace={calls.place}
      onRemove={calls.remove}
      onFill={calls.fill}
      {...more}
    />,
  );
  return calls;
}

describe("TeamSeats", () => {
  it("shows five seats: the player, a Stack mate, and open seats for any hero", () => {
    setup([
      { id: SOLO_ME, position: 2 },
      { id: "a", position: 1 },
    ]);
    const seats = within(screen.getByRole("list", { name: "Team Seats" })).getAllByRole("listitem");
    expect(seats).toHaveLength(5);
    expect(seats[0]).toHaveTextContent(/^Pos 1Carry\s*Ana$/);
    expect(seats[0]).toHaveAttribute("title", "Ana, Night Shift");
    expect(seats[1]).toHaveTextContent("You");
    expect(seats[2]).toHaveAttribute("title", "Open Seat, Any Hero");
    expect(within(seats[2]!).getByRole("button", { name: "Add Player to Pos 3" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Plan For" })).not.toHaveTextContent("seats filled");
  });

  it("shows the hero picked or planned for a seat as its face", () => {
    setup([{ id: SOLO_ME, position: 2 }], { heroAt: (p) => (p === 2 ? 7 : null) });
    const seats = within(screen.getByRole("list", { name: "Team Seats" })).getAllByRole("listitem");
    expect(within(seats[1]!).getByRole("img", { name: "Hero 7" })).toBeInTheDocument();
    expect(within(seats[0]!).queryByRole("img")).not.toBeInTheDocument();
  });

  it("adds a friend to an open seat with the keyboard only", async () => {
    const calls = setup([{ id: SOLO_ME, position: 2 }]);
    await userEvent.click(screen.getAllByRole("button", { name: "Add Player to Pos 4" })[0]);
    const search = screen.getByRole("combobox", { name: "Find a Stack mate or friend for Pos 4" });
    expect(search).toHaveFocus();
    await userEvent.keyboard("bo{Enter}");
    expect(calls.place).toHaveBeenCalledWith("b", 4);
  });

  it("lists everyone once, says who is planned as any hero, and never lets a Manager add an owner who doesn't share", async () => {
    setup([{ id: SOLO_ME, position: 2 }]);
    await userEvent.click(screen.getAllByRole("button", { name: "Add Player to Pos 5" })[0]);
    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option")).toHaveLength(4);
    expect(within(list).getByRole("option", { name: /Cy/ })).toHaveTextContent("planned as any hero");
    expect(within(list).getByRole("option", { name: /Oz/ })).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(screen.getByRole("button", { name: "Friends, 2 people" }));
    expect(within(list).getAllByRole("option").map((o) => o.textContent)).toEqual([
      expect.stringContaining("Bo"),
      expect.stringContaining("Cy"),
    ]);
  });

  it("moves the highlighted row with the mouse, so hover and Enter pick the same person", async () => {
    const calls = setup([{ id: SOLO_ME, position: 2 }]);
    await userEvent.click(screen.getAllByRole("button", { name: "Add Player to Pos 4" })[0]);
    const list = screen.getByRole("listbox");
    expect(within(list).getByRole("option", { name: /Ana/ })).toHaveAttribute("aria-selected", "true");
    await userEvent.hover(within(list).getByRole("option", { name: /Bo/ }));
    expect(within(list).getByRole("option", { name: /Ana/ })).toHaveAttribute("aria-selected", "false");
    expect(within(list).getByRole("option", { name: /Bo/ })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{Enter}");
    expect(calls.place).toHaveBeenCalledWith("b", 4);
  });

  it("closes the picker with Escape and removes a seated player", async () => {
    const calls = setup([
      { id: SOLO_ME, position: 2 },
      { id: "a", position: 1 },
    ]);
    await userEvent.click(screen.getAllByRole("button", { name: "Add Player to Pos 3" })[0]);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove Ana from Pos 1" }));
    expect(calls.remove).toHaveBeenCalledWith("a");
  });

  it("signed out, only the player can take a seat, and it asks them to sign in for the rest", async () => {
    const calls = setup([], { signedIn: false, people: null, stacks: [] });
    expect(screen.getByText(/to add Stack mates and friends/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Add Me to Pos 3" })[0]);
    expect(calls.place).toHaveBeenCalledWith(SOLO_ME, 3);
  });
});
