import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { Hero } from "@/lib/heroes";
import { PoolProvider, PoolStage, useReportPool } from "./pool-stage";

const hero = (id: number, name: string) => ({ id, name, image: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${id}.png` }) as Hero;
const HEROES = [hero(8, "Juggernaut"), hero(44, "Phantom Assassin"), hero(74, "Invoker")];
const STATS = { 8: { games: 41, wins: 20 }, 44: { games: 32, wins: 13 }, 74: { games: 9, wins: 5 } };

/** Stands in for the lists under the opening: it holds them and reports each change. */
function Lists({ initial }: { initial: Record<number, number[]> }) {
  const [picks, setPicks] = useState(initial);
  useReportPool(picks);
  return (
    <>
      <button type="button" onClick={() => setPicks({ 1: [44], 2: [74] })}>
        Remove Juggernaut
      </button>
      <button type="button" onClick={() => setPicks({})}>
        Remove All
      </button>
    </>
  );
}

describe("PoolStage", () => {
  it("opens on the pool hero played most and follows the lists as they change", () => {
    const initial = { 1: [8, 44], 2: [74] };
    const { container } = render(
      <PoolProvider initial={initial}>
        <PoolStage heroes={HEROES} stats={STATS} aside={<button type="button">Page Tour</button>} />
        <Lists initial={initial} />
      </PoolProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "My Heroes: Juggernaut Leads Your Pool, 41 Games in 6 Months" })).toBeInTheDocument();
    expect(screen.getByText("3 heroes in 2 of 5 roles")).toBeInTheDocument();
    expect(container.querySelector("img")?.getAttribute("src")).toContain("8.png");
    expect(screen.getByRole("button", { name: "Page Tour" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove Juggernaut" }));
    expect(screen.getByRole("heading", { level: 1, name: "My Heroes: Phantom Assassin Leads Your Pool, 32 Games in 6 Months" })).toBeInTheDocument();
    expect(screen.getByText("2 heroes in 2 of 5 roles")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove All" }));
    expect(screen.getByRole("heading", { level: 1, name: "My Heroes: No Heroes in Your Pool Yet" })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("works without a provider, as an empty pool", () => {
    render(<PoolStage heroes={HEROES} stats={STATS} />);
    expect(screen.getByRole("heading", { level: 1, name: "My Heroes: No Heroes in Your Pool Yet" })).toBeInTheDocument();
  });
});
