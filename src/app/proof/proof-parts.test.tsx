import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Hero } from "@/lib/heroes";
import { sampleProof } from "../../../test/fixtures/proof";
import { GameRows, LaneFrame, RankRoleTiles, RivalRows, RunningLine, scaleFor } from "./proof-parts";

describe("scaleFor", () => {
  it("covers every value in whole steps, never narrower than the default", () => {
    expect(scaleFor([1, 4], 0, 10, 5)).toEqual([0, 10]);
    expect(scaleFor([-3.2, 12.1], 0, 10, 5)).toEqual([-5, 15]);
  });
});

describe("Proof Page parts", () => {
  const proof = sampleProof();

  it("puts both win rates and the gain in the lane frame", () => {
    render(<LaneFrame lift={proof.rivals.engine} />);
    expect(screen.getByText("57.0%")).toBeInTheDocument();
    expect(screen.getByText("49.1%")).toBeInTheDocument();
    expect(screen.getByText("+7.9")).toBeInTheDocument();
  });

  it("lists our picks first, then both simple rules", () => {
    render(<RivalRows rivals={proof.rivals} />);
    const names = ["Our Picks", "Highest Win Rate", "Most Played"].map((n) => screen.getByText(n));
    expect(names[0]!.compareDocumentPosition(names[2]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("+4.6")).toBeInTheDocument();
  });

  it("shows rank groups as medals only, named for screen readers, and roles with their symbols", () => {
    render(<RankRoleTiles byRank={proof.byRank} byRole={proof.byRole} />);
    expect(screen.getByRole("img", { name: "Herald" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Guardian" })).toBeInTheDocument();
    expect(screen.queryByText("Herald")).not.toBeInTheDocument();
    // Groups without numbers (2 and 4 here) are left out.
    expect(screen.queryByRole("img", { name: "Crusader" })).not.toBeInTheDocument();
    expect(screen.getByText("Carry")).toBeInTheDocument();
    expect(screen.getByText("Hard Support")).toBeInTheDocument();
  });

  it("draws the running line with today's range in words", () => {
    render(<RunningLine running={proof.running} />);
    expect(screen.getByText(/Today \+7\.9, from \+5\.7 to \+10\.1/)).toBeInTheDocument();
    render(<RunningLine running={proof.running.slice(0, 1)} />);
    expect(screen.getByText(/The line starts once/)).toBeInTheDocument();
  });

  it("shows real games with the result and an OpenDota button", () => {
    const heroes = new Map<number, Hero>([
      [
        13,
        {
          id: 13,
          name: "Puck",
          image: "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/puck.png",
          icon: "",
          primaryAttr: "int",
          roles: [],
        },
      ],
    ]);
    render(<GameRows examples={proof.examples} heroes={heroes} />);
    expect(screen.getByText("Puck")).toBeInTheDocument();
    expect(screen.getByText("Won")).toBeInTheDocument();
    expect(screen.getByText("Last Round")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Match 9091082013 on OpenDota" })).toBeInTheDocument();
  });
});
