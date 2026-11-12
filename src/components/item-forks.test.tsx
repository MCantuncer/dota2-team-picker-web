import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ItemFork } from "@/lib/item-forks";
import { ItemForks, lateLine } from "./item-forks";

const fork = (over: Partial<ItemFork>): ItemFork => ({
  itemId: 137,
  name: "Radiance",
  img: "/i/137.png",
  late: 18,
  running: 61,
  onTime: 15,
  lateGames: 46,
  keyLater: 4,
  split: true,
  road: "own",
  steps: [{ itemId: 116, name: "Black King Bar", img: "/i/116.png", minute: 24, games: 24 }],
  ...over,
});

describe("ItemForks", () => {
  it("shows nothing without forks", () => {
    const { container } = render(<ItemForks forks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("splits a key item into on time and late lanes, with the road the late wins took", () => {
    render(<ItemForks forks={[fork({})]} />);
    expect(screen.getByRole("heading", { name: "If a Key Item Is Late" })).toBeVisible();
    const lanes = screen.getByRole("list", { name: "Radiance on time or late" });
    expect(within(lanes).getByRole("img", { name: "15 of 61 wins" })).toBeVisible();
    expect(within(lanes).getByRole("img", { name: "46 of 61 wins" })).toBeVisible();
    const road = within(lanes).getByRole("list", { name: "What these wins bought next" });
    expect(within(road).getByText("Black King Bar")).toBeVisible();
    expect(within(road).getByText("24 min, next in 24 wins")).toBeVisible();
    expect(within(lanes).getByText("4 of 46 bought Radiance after 18 min.")).toBeVisible();
  });

  it("says it in one line when nearly every win had the item on time", () => {
    render(<ItemForks forks={[fork({ name: "Battle Fury", late: 15, running: 54, onTime: 51, lateGames: 3, split: false, steps: [], road: "none" })]} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(/wins had it on time/)).toHaveTextContent("51 of 54 wins had it on time.");
  });
});

describe("lateLine", () => {
  it("says what is known about the late wins, and no more", () => {
    expect(lateLine({ name: "Radiance", late: 18, lateGames: 46, keyLater: 4, road: "own" })).toBe("4 of 46 bought Radiance after 18 min.");
    expect(lateLine({ name: "Manta Style", late: 22, lateGames: 17, keyLater: 9, road: "earlier" })).toBe(
      "9 of 17 bought Manta Style after 22 min. They bought the build's earlier items, then no next item was common.",
    );
    expect(lateLine({ name: "Battle Fury", late: 18, lateGames: 18, keyLater: 0, road: "own" })).toBe("None of the 18 bought Battle Fury after 18 min.");
    // No path: with 12 or more late wins none was common; with fewer the backend didn't look.
    expect(lateLine({ name: "Blink Dagger", late: 20, lateGames: 14, road: "none" })).toBe("No next item was common in these wins.");
    expect(lateLine({ name: "Blink Dagger", late: 20, lateGames: 10, road: "none" })).toBe("Too few late wins to show what they bought.");
  });
});
