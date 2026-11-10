import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PoolCheck, PoolSlip } from "@/lib/admin-pool-check";
import { CheckStrip, Slips } from "./pool-check";

const NOW = Date.parse("2026-11-08T12:00:00Z");
const check: PoolCheck = { lists: 12, poolLists: 7, playedLists: 3, slips: 0, anyLists: 2, unknownLists: 0, players: 4 };
const heroes = [
  { id: 74, name: "Invoker", icon: "https://cdn.example/invoker.png" },
  { id: 92, name: "Visage", icon: "https://cdn.example/visage.png" },
];

describe("CheckStrip", () => {
  it("shows the slips first, with the lists they come from", () => {
    render(<CheckStrip check={check} />);
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual(["Slips", "Pool Lists", "Played Lists", "Any Hero Lists", "Older Lists"]);
    expect(screen.getByText("12 lists from 4 players.")).toBeInTheDocument();
  });

  it("marks any slip as an error", () => {
    const { rerender } = render(<CheckStrip check={check} />);
    expect(screen.getByText("Slips").nextElementSibling).toHaveClass("text-accent");
    rerender(<CheckStrip check={{ ...check, slips: 3 }} />);
    expect(screen.getByText("Slips").nextElementSibling).toHaveClass("text-danger");
  });
});

describe("Slips", () => {
  const slip: PoolSlip = { draftId: "d", userId: "u", name: "Lina", position: 5, heroes: [92, 5, 6], outside: [92], at: "2026-11-08T09:30:00Z" };

  it("says so when there are none", () => {
    render(<Slips slips={[]} heroes={heroes} nowMs={NOW} />);
    expect(screen.getByText(/No slips/)).toBeInTheDocument();
  });

  it("names the player, the position, the outside heroes and the time in Turkey time", () => {
    render(<Slips slips={[slip, { ...slip, userId: "v", outside: [99] }]} heroes={heroes} nowMs={NOW} />);
    const [first, second] = screen.getAllByRole("listitem");
    expect(first).toHaveTextContent("Lina");
    expect(first).toHaveTextContent("Pos 5");
    expect(first).toHaveTextContent("1 of 3 outside:Visage");
    expect(first).toHaveTextContent("Today, 12:30");
    expect(second).toHaveTextContent("Hero 99");
  });
});
