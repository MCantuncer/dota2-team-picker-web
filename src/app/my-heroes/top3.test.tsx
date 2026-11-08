import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Hero } from "@/lib/heroes";
import { PositionHeroes } from "./position-heroes";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

const hero = (id: number, name: string): Hero => ({
  id,
  name,
  image: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${id}.png`,
  icon: "",
  primaryAttr: "int",
  roles: [],
});
const heroes = [hero(74, "Invoker"), hero(76, "Outworld Devourer"), hero(14, "Pudge"), hero(13, "Puck"), hero(11, "Shadow Fiend")];
const lastPlayed = new Date(Date.now() - 7 * 86_400_000 - 3_600_000).toISOString();

const show = (top: number[] = []) =>
  render(
    <PositionHeroes
      userId="u1"
      heroes={heroes}
      initialPositions={[2]}
      initialHeroes={{ 2: [74, 76, 14, 13] }}
      initialTop={{ 2: top }}
      fillNumbers={{ "2:74": { games: 58, wins: 22, lastPlayed } }}
    />,
  );
const chip = (name: string) => screen.getByRole("button", { name: new RegExp(`^\\d${name}`) });
const card = (name: string) => screen.getByRole("dialog", { name });
const chipOrder = () =>
  within(screen.getByRole("region", { name: "Mid heroes" }))
    .getAllByRole("button", { expanded: false })
    .map((b) => b.textContent);

describe("My Heroes Top 3", () => {
  beforeEach(() => rpc.mockReset());

  it("opens a filled hero's card with its numbers and both buttons", async () => {
    show();
    await userEvent.click(chip("Invoker"));
    const c = card("Invoker");
    expect(c).toHaveTextContent("From Your Games · Mid");
    expect(c).toHaveTextContent("58Games");
    expect(c).toHaveTextContent("38%Won 22");
    expect(c).toHaveTextContent("7 daysLast Played");
    expect(within(c).getByRole("button", { name: "Add to Top 3" })).toHaveFocus();
    expect(within(c).getByRole("button", { name: "Remove from Mid" })).toBeInTheDocument();
  });

  it("shows no numbers for a hero the player added", async () => {
    show();
    await userEvent.click(chip("Pudge"));
    expect(card("Pudge")).not.toHaveTextContent("Games");
  });

  it("adds a hero to the Top 3, stars it and moves it first", async () => {
    rpc.mockResolvedValue({ data: { position: 2, top: [14] }, error: null });
    show();
    await userEvent.click(chip("Pudge"));
    await userEvent.click(screen.getByRole("button", { name: "Add to Top 3" }));
    expect(rpc).toHaveBeenCalledWith("set_top_hero", { hero_position: 2, hero: 14, is_top: true });
    expect(chip("Pudge, in your Top 3")).toHaveTextContent(/^1Pudge/);
    expect(screen.getByRole("button", { name: "Remove from Top 3" })).toBeInTheDocument();
  });

  it("asks which hero to replace when the Top 3 is full, and swaps in one step", async () => {
    rpc.mockResolvedValue({ data: { position: 2, top: [74, 14, 13] }, error: null });
    show([76, 14, 13]);
    await userEvent.click(chip("Invoker"));
    await userEvent.click(screen.getByRole("button", { name: "Add to Top 3" }));
    expect(rpc).not.toHaveBeenCalled();
    const replace = screen.getByRole("dialog", { name: "Add Invoker to Your Top 3" });
    expect(replace).toHaveTextContent("Your Top 3 is full. Pick the hero Invoker replaces.");
    await userEvent.click(within(replace).getByRole("button", { name: "Replace Outworld Devourer with Invoker" }));
    expect(rpc).toHaveBeenCalledWith("set_top_hero", { hero_position: 2, hero: 74, is_top: true, replace_hero: 76 });
    expect(screen.queryByRole("dialog", { name: /Your Top 3/ })).not.toBeInTheDocument();
    expect(chip("Invoker, in your Top 3")).toHaveTextContent(/^1Invoker/);
  });

  it("cancels the replace card with Cancel or Escape", async () => {
    show([76, 14, 13]);
    await userEvent.click(chip("Invoker"));
    await userEvent.click(screen.getByRole("button", { name: "Add to Top 3" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: /Your Top 3/ })).not.toBeInTheDocument();
    await userEvent.click(chip("Invoker"));
    await userEvent.click(screen.getByRole("button", { name: "Add to Top 3" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /Your Top 3/ })).not.toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("removes a hero from the Top 3", async () => {
    rpc.mockResolvedValue({ data: { position: 2, top: [] }, error: null });
    show([14]);
    await userEvent.click(chip("Pudge, in your Top 3"));
    await userEvent.click(screen.getByRole("button", { name: "Remove from Top 3" }));
    expect(rpc).toHaveBeenCalledWith("set_top_hero", { hero_position: 2, hero: 14, is_top: false });
    expect(screen.queryByText(", in your Top 3")).not.toBeInTheDocument();
  });

  it("removes a hero from the position from its card", async () => {
    rpc.mockResolvedValue({ data: { heroes: { "4": [], "5": [] }, support_copy: null, support_copy_from: null }, error: null });
    show([14]);
    await userEvent.click(chip("Pudge, in your Top 3"));
    await userEvent.click(screen.getByRole("button", { name: "Remove from Mid" }));
    expect(rpc).toHaveBeenCalledWith("set_favorite_hero", { hero_position: 2, hero: 14, is_on: false });
    expect(screen.queryByRole("button", { name: /^\dPudge/ })).not.toBeInTheDocument();
  });

  it("drops the star when the hero leaves the list, so adding it back starts unstarred", async () => {
    rpc.mockResolvedValue({ data: { heroes: { "4": [], "5": [] }, support_copy: null, support_copy_from: null }, error: null });
    show([14]);
    await userEvent.click(screen.getByRole("button", { name: "Remove Pudge from Mid" }));
    await userEvent.click(screen.getByRole("button", { name: "Pudge" }));
    expect(chip("Pudge")).not.toHaveAccessibleName(/in your Top 3/);
  });

  it("orders the Top 3 first in slot order", () => {
    show([13, 76]);
    expect(chipOrder().slice(0, 4)).toEqual(["1Puck", "2Outworld Devourer", "3Invoker", "4Pudge"].map((t) => expect.stringContaining(t)));
  });

  it("closes the card with Escape", async () => {
    show();
    await userEvent.click(chip("Pudge"));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Pudge" })).not.toBeInTheDocument();
    expect(chip("Pudge")).toHaveFocus();
  });

  it("says so when the Top 3 isn't saved", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "boom" } });
    show();
    await userEvent.click(chip("Pudge"));
    await userEvent.click(screen.getByRole("button", { name: "Add to Top 3" }));
    expect(screen.getByText("Could not save your Top 3. Please try again.")).toBeInTheDocument();
  });
});
