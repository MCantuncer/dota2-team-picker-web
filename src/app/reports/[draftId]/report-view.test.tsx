import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fixture from "../../../../test/fixtures/report-facts-v1.json";
import { readFacts } from "@/lib/report-facts";
import { type ReportArt, ReportView } from "./report-view";

const facts = readFacts(structuredClone(fixture), 1)!; // Checked in report-facts.test.ts.
const art: ReportArt = {
  heroes: new Map([
    [25, { name: "Lina", image: "https://cdn.cloudflare.steamstatic.com/lina.png" }],
    [145, { name: "Kez" }],
  ]),
  items: new Map([[168, { name: "Power Treads", image: "https://cdn.cloudflare.steamstatic.com/treads.png" }]]),
};

describe("ReportView", () => {
  it("shows the result, our heroes and the parsed parts", () => {
    render(<ReportView facts={facts} art={art} myHeroId={145} />);
    expect(screen.getByText("Won in 34:26, 57 to 32 in kills.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Match 9072422905 on OpenDota/ })).toHaveAttribute(
      "href",
      "https://www.opendota.com/matches/9072422905",
    );

    const team = within(screen.getByRole("region", { name: "Your team" }));
    expect(team.getAllByText("Kills, deaths, assists:", { exact: false })).toHaveLength(5);
    // Heroes without art still show their names; unknown heroes get a plain label.
    expect(team.getAllByText("Kez").length).toBeGreaterThan(0);
    expect(team.getAllByText("Hero 70").length).toBeGreaterThan(0);
    expect(team.getByText("YOU")).toBeInTheDocument();
    expect(team.getByRole("img", { name: "Power Treads" })).toBeInTheDocument();

    expect(screen.getByRole("region", { name: "Lanes at 10 minutes" })).toHaveTextContent("Mid (Lina): even at 10 minutes.");
    expect(screen.getByRole("region", { name: "Turning points" })).toHaveTextContent("Minutes 28 to 31: 13k gold swung your way.");
    expect(screen.getByRole("region", { name: "What hurt you" })).toHaveTextContent("Right-clicks: 33% of the damage you took.");
  });

  it("leaves out what a basic report doesn't have", () => {
    const basic = { ...facts, isBasic: true, swings: null, lanes: null, fights: null, damageTaken: null, enemyBest: null, draft: null };
    render(<ReportView facts={basic} art={art} myHeroId={null} />);
    expect(screen.getByRole("region", { name: "Your team" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Lanes at 10 minutes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Turning points" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "What hurt you" })).not.toBeInTheDocument();
    expect(screen.queryByText("YOU")).not.toBeInTheDocument();
  });

  it("reviews the draft when lists were saved", () => {
    render(<ReportView facts={{ ...facts, draft: [{ heroId: 25, suggestionRank: 2, listSize: 8 }] }} art={art} myHeroId={null} />);
    expect(screen.getByRole("region", { name: "Draft" })).toHaveTextContent("Lina: suggestion 2 of 8.");
  });
});
