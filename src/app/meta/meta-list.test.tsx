import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HeroRate } from "@/lib/meta";
import { HeroList } from "./meta-list";

const rate = (id: number, pick: number, win: number, baseWin: number | null): HeroRate => ({
  id,
  games: 10_000,
  pick,
  win,
  basePick: baseWin === null ? null : pick,
  baseWin,
  days: [win - 1, win],
  roles: [1],
});

const RATES = Array.from({ length: 12 }, (_, i) => rate(i + 1, 2 + i, 45 + i, i === 0 ? null : 50));
const HEROES = new Map(RATES.map((r) => [r.id, { id: r.id, name: `Hero ${String.fromCharCode(64 + r.id)}`, image: "/h.png", icon: "/i.png" }]));
const rowNames = () => screen.getAllByRole("listitem").map((li) => within(li).getAllByText(/^Hero /)[0]!.textContent);

describe("HeroList", () => {
  it("shows the top 10 by win rate, then every hero", async () => {
    render(<HeroList rates={RATES} heroes={HEROES} selected={null} onSelect={() => {}} />);
    expect(rowNames()).toHaveLength(10);
    expect(rowNames()[0]).toBe("Hero L"); // id 12, the best win rate
    await userEvent.click(screen.getByRole("button", { name: "Show All 12 Heroes" }));
    expect(rowNames()).toHaveLength(12);
  });

  it("sorts by name and by change, with heroes new this patch last", async () => {
    render(<HeroList rates={RATES} heroes={HEROES} selected={null} onSelect={() => {}} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Hero" })[0]!);
    expect(rowNames()[0]).toBe("Hero A");
    await userEvent.click(screen.getAllByRole("button", { name: "Change" })[0]!);
    expect(screen.queryByText("New")).toBeNull(); // hero 1 (no base) is past the top 10
    await userEvent.click(screen.getByRole("button", { name: "Show All 12 Heroes" }));
    expect(rowNames().at(-1)).toBe("Hero A");
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("picks a hero and marks the picked one", async () => {
    const onSelect = vi.fn();
    render(<HeroList rates={RATES} heroes={HEROES} selected={12} onSelect={onSelect} />);
    const rows = screen.getAllByRole("listitem").map((li) => within(li).getByRole("button"));
    expect(rows[0]).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(rows[1]!);
    expect(onSelect).toHaveBeenCalledWith(11);
  });
});
