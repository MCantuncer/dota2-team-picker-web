import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MetaExtras } from "@/lib/meta";
import { BuildPanel, MatchupsPanel, NewItems } from "./meta-hero-extras";

const RIKI = { id: 32, name: "Riki", image: "/riki.png", icon: "/riki-icon.png" };
const HEROES = new Map([
  [32, RIKI],
  [17, { id: 17, name: "Storm Spirit", image: "/s.png", icon: "/s-icon.png" }],
  [94, { id: 94, name: "Medusa", image: "/m.png", icon: "/m-icon.png" }],
]);
const ART = {
  1: { name: "Blink Dagger", image: "/blink.png" },
  63: { name: "Power Treads", image: "/treads.png" },
  36: { name: "Magic Wand", image: "/wand.png" },
  947: { name: "Occult Bracelet", image: "/occult.png" },
  1942: { name: "Bloodslinger", image: "/blood.png" },
  1955: { name: "Caduceus", image: "/cad.png" },
};
const EXTRAS: MetaExtras = {
  buildGames: 300,
  builds: {
    32: {
      0: { games: 100, items: [[63, 80], [36, 30]], neutral: [[947, 20]] },
      2: { games: 50, items: [[1, 40]], neutral: [] },
    },
  },
  newItems: [
    { id: 1942, games: 12, heroes: [[32, 8]] },
    { id: 1955, games: 0, heroes: [] },
  ],
  matchups: { 32: { best: [[17, 60.7, 3039]], worst: [[94, 42.4, 1108]] } },
  items: {},
};

describe("BuildPanel", () => {
  it("shows the build in Core and Common with shares, and switches role", async () => {
    render(<BuildPanel hero={RIKI} extras={EXTRAS} role={0} art={ART} patch="7.42" />);
    expect(screen.getByText("Share of 100 Riki games that ended with each item")).toBeInTheDocument();
    const core = screen.getByRole("heading", { name: "Core" }).parentElement!;
    expect(within(core).getByText("Power Treads")).toBeInTheDocument();
    expect(within(core).getByText("80%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Common" })).toBeInTheDocument();
    expect(screen.getByText("Occult Bracelet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mid" }));
    expect(screen.getByText("Share of 50 Riki games as Mid that ended with each item")).toBeInTheDocument();
    expect(screen.getByText("Blink Dagger")).toBeInTheDocument();
  });

  it("opens on the page's role when the hero has a build there", () => {
    render(<BuildPanel hero={RIKI} extras={EXTRAS} role={2} art={ART} patch="7.42" />);
    expect(screen.getByRole("button", { name: "Mid" })).toHaveAttribute("aria-pressed", "true");
  });

  it("says builds are being counted when the hero has none yet", () => {
    render(<BuildPanel hero={{ ...RIKI, id: 1 }} extras={EXTRAS} role={0} art={ART} patch="7.42" />);
    expect(screen.getByText(/Builds are being counted/)).toBeInTheDocument();
  });
});

describe("MatchupsPanel and NewItems", () => {
  it("lists best and worst enemies, each opening its own card", async () => {
    const onSelect = vi.fn();
    render(<MatchupsPanel hero={RIKI} extras={EXTRAS} heroes={HEROES} onSelect={onSelect} />);
    expect(screen.getByText("60.7%")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Medusa: wins 42.4% against/ }));
    expect(onSelect).toHaveBeenCalledWith(94);
  });

  it("shows each new item's games and heroes, or that it has not been seen", () => {
    render(<NewItems extras={EXTRAS} art={ART} heroes={HEROES} onSelect={() => {}} />);
    expect(screen.getByText("Bloodslinger")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Riki, 8 games/ })).toBeInTheDocument();
    expect(screen.getByText("Not seen yet")).toBeInTheDocument();
  });
});
