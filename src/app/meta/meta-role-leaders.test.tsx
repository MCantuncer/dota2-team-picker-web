import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HeroRate, MetaDay, MetaExtras, RoleHero } from "@/lib/meta";
import { DarkHorseCard, LeaderCard, RoleTabs, whyLine } from "./meta-role-leaders";

const RIKI = { id: 32, name: "Riki", image: "/riki.png", icon: "/riki-icon.png" };
const HEROES = new Map([
  [32, RIKI],
  [94, { id: 94, name: "Medusa", image: "/m.png", icon: "/m-icon.png" }],
]);
const DAYS: MetaDay[] = [0, 1].map((index) => ({ index, from: `2026-11-1${8 + index}T21:28:07Z`, to: "", complete: true, games: [1, 0, 0, 0, 0], heroes: {} }));
const RATE: HeroRate = { id: 32, games: 50_000, pick: 6.1, win: 53.4, basePick: 5, baseWin: 50.2, days: [53, 53.8], roles: [1, 2] };
const H: RoleHero = { rate: RATE, share: 60, extraWins: 1020 };
const ART = { 1: { name: "Blink Dagger", image: "/blink.png" }, 36: { name: "Magic Wand", image: "/wand.png" } };
const EXTRAS: MetaExtras = {
  buildGames: 300,
  builds: { 32: { 2: { games: 50, items: [[1, 40], [36, 30]], neutral: [], buyGames: 12, minutes: [[1, 14]], early: [[36, 9]] } } },
  newItems: [],
  matchups: { 32: { best: [], worst: [[94, 42.4, 1108]] } },
  items: { 1: { key: "blink", name: "Blink Dagger", cost: 2250, img: "", components: [] }, 36: { key: "magic_wand", name: "Magic Wand", cost: 450, img: "", components: [] } },
  patchNotes: { 32: { changes: 4, lines: [{ ability: "Blink Strike", text: "Cooldown decreased from 16s to 14s", tone: 1 }] } },
};
const props = { role: 2, hero: RIKI, high: { ...RATE, win: 55.9 }, days: DAYS, oldPatch: "7.41", extras: EXTRAS, art: ART, heroes: HEROES };

describe("RoleTabs", () => {
  it("marks the open role and moves with the arrow keys", async () => {
    const onChange = vi.fn();
    render(<RoleTabs role={2} onChange={onChange} />);
    expect(screen.getByRole("tab", { name: "Mid" })).toHaveAttribute("aria-selected", "true");
    screen.getByRole("tab", { name: "Mid" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith(3);
  });
});

describe("LeaderCard", () => {
  it("shows the numbers, patch lines, build path with minutes and the Enemy it loses to", async () => {
    const onSelect = vi.fn();
    render(<LeaderCard h={H} i={0} all={[H]} {...props} onSelect={onSelect} />);
    const card = screen.getByRole("article", { name: "Riki" });
    expect(within(card).getByText("Top Mid")).toBeInTheDocument();
    expect(within(card).getByText("+3.2 vs 7.41")).toBeInTheDocument();
    expect(within(card).getByText("55.9%")).toBeInTheDocument();
    expect(within(card).getByText("Blink Strike")).toBeInTheDocument();
    expect(within(card).getByText("4 changes")).toBeInTheDocument();
    expect(within(card).getByText("Core, in the Order Bought")).toBeInTheDocument();
    expect(within(card).getByText("14 min")).toBeInTheDocument();
    // Magic Wand is an early item: 9 of 12 parsed games.
    expect(within(card).getByText("75%")).toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: /^Medusa: wins 42.4% against/ }));
    expect(onSelect).toHaveBeenCalledWith(94);
  });

  it("says builds are being counted for a role without one", () => {
    render(<LeaderCard h={H} i={1} all={[H]} {...props} role={1} onSelect={() => {}} />);
    expect(screen.getByText("Builds are being counted for this role.")).toBeInTheDocument();
  });
});

describe("DarkHorseCard and whyLine", () => {
  it("shows the rise since the patch before", () => {
    render(<DarkHorseCard h={H} {...props} onSelect={() => {}} />);
    expect(screen.getByText("Up 3.2 Since 7.41")).toBeInTheDocument();
  });

  it("builds a sentence from the hero's own numbers", () => {
    expect(whyLine(H, { ...RATE, win: 55.9 }, 4, 2, "7.41")).toBe(
      "Wins 55.9% in Divine and Immortal, 2.5 points more than across all ranks, and up 3.2 points since 7.41 with 4 changes in the patch.",
    );
  });
});
