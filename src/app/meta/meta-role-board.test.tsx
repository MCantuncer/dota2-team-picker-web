import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HeroRate, RoleHero } from "@/lib/meta";
import { MetaGlance, RoleItems } from "./meta-role-board";
import { MoverRows, moverScale } from "./meta-movers";

const HEROES = new Map([
  [32, { id: 32, name: "Riki", image: "/riki.png", icon: "/riki-icon.png" }],
  [94, { id: 94, name: "Medusa", image: "/m.png", icon: "/m-icon.png" }],
]);
const rate = (id: number, win: number, baseWin: number | null): HeroRate => ({ id, games: 50_000, pick: 5, win, basePick: 5, baseWin, days: [], roles: [1] });
const hero = (r: HeroRate): RoleHero => ({ rate: r, share: 60, extraWins: 100 });

describe("RoleItems", () => {
  it("shows each item with its share and marks new items", () => {
    render(<RoleItems items={[{ id: 1, share: 32.4, isNew: false }, { id: 2, share: 8, isNew: true }]} art={{ 1: { name: "Black King Bar", image: "/bkb.png" }, 2: { name: "Witch Blade", image: "/wb.png" } }} />);
    expect(screen.getByText("Black King Bar")).toBeInTheDocument();
    expect(screen.getByText("32%")).toBeInTheDocument();
    expect(within(screen.getByText("Witch Blade").closest("li")!).getByText("New")).toBeInTheDocument();
  });
});

describe("MetaGlance", () => {
  it("shows each role's leaders and opens a role or a hero", async () => {
    const onRole = vi.fn();
    const onSelect = vi.fn();
    render(<MetaGlance roles={[[hero(rate(32, 55.2, 51.2))], [], [], [], [hero(rate(94, 50.1, null))]]} heroes={HEROES} onRole={onRole} onSelect={onSelect} />);
    expect(screen.getByText("+4.0")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getAllByText("Too few games at this rank yet.")).toHaveLength(3);
    await userEvent.click(screen.getByRole("button", { name: "Open Hard Support Leaders" }));
    expect(onRole).toHaveBeenCalledWith(5);
    await userEvent.click(screen.getByRole("button", { name: /^Riki, 55.2% win rate/ }));
    expect(onSelect).toHaveBeenCalledWith(32);
  });
});

describe("MoverRows", () => {
  it("shares one even scale of at least 4 points and shows each change", async () => {
    const rows = [rate(32, 55.3, 50), rate(94, 49, 50)];
    expect(moverScale(rows, "win")).toBe(6);
    expect(moverScale([rate(32, 51, 50)], "win")).toBe(4);
    const onSelect = vi.fn();
    render(<MoverRows rows={[rows[0]!]} measure="win" rising heroes={HEROES} max={6} onSelect={onSelect} />);
    expect(screen.getByText("50.0% to 55.3%")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Riki: 50.0% to 55.3%, \+5.3 points/ }));
    expect(onSelect).toHaveBeenCalledWith(32);
  });
});
