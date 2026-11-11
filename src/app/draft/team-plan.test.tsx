import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AnotherTeam, PlannedSlot, TeamNeed, TeamPlan } from "@/lib/engine/plan";
import type { Position } from "@/lib/engine/types";
import { SuperTeamPanel } from "./super-team";
import { TeamPlanLane } from "./team-plan";

const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";
const HEROES: Record<number, string> = {
  8: "Juggernaut",
  74: "Invoker",
  129: "Mars",
  128: "Snapfire",
  50: "Dazzle",
  13: "Puck",
  2: "Axe",
  26: "Lion",
  11: "Shadow Fiend",
  14: "Pudge",
};
const hero = (id: number) => ({
  name: HEROES[id] ?? "",
  portrait: `${CDN}/${id}.png`,
});

const slot = (position: Position, heroId: number, extra: Partial<PlannedSlot> = {}): PlannedSlot => ({
  position,
  playerId: `p${position}`,
  heroId,
  name: HEROES[heroId]!,
  locked: false,
  inPool: true,
  reasons: [],
  ...extra,
});

const needs: TeamNeed[] = [
  { need: "disable", label: "Stun", heroes: [74, 129], wanted: 1 },
  { need: "save", label: "Save", heroes: [], wanted: 1 },
];

const another: AnotherTeam = {
  slots: [
    {
      position: 1,
      playerId: "p1",
      heroId: 8,
      name: "Juggernaut",
      locked: true,
      inPool: true,
      same: true,
    },
    {
      position: 2,
      playerId: "p2",
      heroId: 13,
      name: "Puck",
      locked: false,
      inPool: true,
      same: false,
    },
    {
      position: 3,
      playerId: "p3",
      heroId: 2,
      name: "Axe",
      locked: false,
      inPool: true,
      same: false,
    },
    {
      position: 4,
      playerId: "p4",
      heroId: 128,
      name: "Snapfire",
      locked: true,
      inPool: true,
      same: true,
    },
    {
      position: 5,
      playerId: "p5",
      heroId: 26,
      name: "Lion",
      locked: false,
      inPool: true,
      same: false,
    },
  ],
  score: 4,
  behind: 12.3,
  verdict: "12.3 points behind: weaker against the enemy picks (-3.9).",
  why: [
    {
      kind: "pair",
      lead: "+1.2",
      text: "Puck and Lion win more together (900 games)",
      heroes: [13, 26],
    },
  ],
  needs: [
    { need: "disable", label: "Stun", heroes: [2, 26], wanted: 1 },
    { need: "save", label: "Save", heroes: [], wanted: 1 },
  ],
};

const plan: TeamPlan = {
  slots: [
    slot(1, 8, {
      locked: true,
      reasons: [{ kind: "meta", lead: "53.0%", text: "win rate at Divine" }],
    }),
    slot(2, 74, {
      reasons: [
        { kind: "meta", lead: "51.8%", text: "win rate at Divine" },
        {
          kind: "pair",
          lead: "+1.6",
          text: "with Dazzle (7,383 games)",
          heroes: [50],
        },
        {
          kind: "counter",
          lead: "-1.5",
          text: "against Shadow Fiend",
          heroes: [11],
        },
      ],
    }),
    slot(3, 129, {
      inPool: false,
      reasons: [
        {
          kind: "combo",
          lead: "Combo",
          text: "with Snapfire: Arena of Blood with Mortimer Kisses inside",
          heroes: [128],
        },
      ],
    }),
    slot(4, 128, { locked: true }),
    slot(5, 50, {
      playerId: undefined,
      reasons: [{ kind: "need", lead: "Only", text: "save on the team", need: "save" }],
    }),
  ],
  score: 10,
  missing: [],
  style: { key: "teamfight", label: "Teamfight", heroes: 4 },
  combos: [
    {
      heroes: ["Mars", "Snapfire"],
      text: "arena of Blood with Mortimer Kisses inside",
    },
  ],
  gamePlan:
    "Teamfight: group up and win the big fights with your ultimates. Key combo: Mars + Snapfire, arena of Blood with Mortimer Kisses inside.",
  why: [
    {
      kind: "pair",
      lead: "+2.1",
      text: "Snapfire and Dazzle win more together (2,822 games)",
      heroes: [128, 50],
    },
    {
      kind: "pair",
      lead: "+1.9",
      text: "Mars and Dazzle win more together (1,621 games)",
      heroes: [129, 50],
    },
    {
      kind: "counter",
      lead: "+4.8",
      text: "against the enemy picks, most from Invoker against Shadow Fiend (+1.5)",
      heroes: [74, 11],
    },
    { kind: "need", lead: "6 of 7", text: "team needs covered, lacks a save" },
  ],
  needs,
  pickFirst: {
    position: 2,
    heroId: 74,
    pickRate: 0.18,
    takenChance: 0.06,
    gap: 8.2,
    exposed: 3.4,
    counter: { heroId: 129, edge: -3.4 },
    reason: {
      kind: "meta",
      lead: "6%",
      text: "chance the enemy takes it; losing it costs the plan 8.2, showing it now lets Mars answer it for 3.4",
    },
  },
  another,
};

function renderLane(props: Partial<Parameters<typeof TeamPlanLane>[0]> = {}) {
  return render(
    <TeamPlanLane
      plan={plan}
      head={<h2>Team Plan</h2>}
      hero={hero}
      names={{ p1: "Deniz", p2: "Me", p3: "Emre", p4: "Arda" }}
      myId="p2"
      pooled={new Set<Position>([1, 2, 3, 4])}
      enemies={[11, 14]}
      {...props}
    />,
  );
}

const card = (name: string) => within(screen.getByRole("article", { name }));

describe("TeamPlanLane", () => {
  it("shows five position cards with the seat, its player or You, and every reason with its number first", () => {
    renderLane();
    expect(within(screen.getByRole("list", { name: "Team Plan" })).getAllByRole("article")).toHaveLength(5);
    expect(card("Juggernaut").getByText("Deniz")).toBeVisible();
    expect(card("Juggernaut").getByText("Pos 1")).toBeVisible();
    expect(card("Invoker").getByText("You")).toBeVisible();
    expect(card("Invoker").queryByText("Me")).toBeNull();
    // Every reason, the number bold first, a real minus sign, and a face for the hero it names.
    const why = within(screen.getByRole("article", { name: "Invoker" }).querySelector("ul")!);
    // The Pick First line, then the three reasons.
    expect(why.getAllByRole("listitem")).toHaveLength(4);
    expect(why.getByText("−1.5")).toHaveClass("font-semibold");
    expect(why.getByText("Dazzle")).toBeVisible();
    expect(why.getByTitle("Shadow Fiend")).toHaveClass("lane-cut-enemy");
    expect(why.getByTitle("Dazzle")).not.toHaveClass("lane-cut-enemy");
  });

  it("marks Pick First with the copper chip, node and the only copper Picked button", () => {
    const { container } = renderLane({ onPicked: vi.fn(), onBanned: vi.fn() });
    expect(card("Invoker").getByText("Pick First")).toHaveClass("chip-accent");
    expect(card("Invoker").getByRole("button", { name: "Picked" })).toHaveClass("btn-primary");
    expect(card("Mars").getByRole("button", { name: "Picked" })).toHaveClass("btn-secondary");
    expect(container.querySelectorAll(".lane-node-now")).toHaveLength(1);
    expect(container.querySelectorAll(".lane-node-done")).toHaveLength(2);
    expect(container.querySelectorAll(".lane-node-open")).toHaveLength(2);
  });

  it("says why to pick first on that card, with the counter's face", () => {
    renderLane();
    const why = screen.getByRole("article", { name: "Invoker" }).querySelector("ul")!;
    const first = within(within(why).getAllByRole("listitem")[0]!);
    expect(first.getByText("6%")).toBeVisible();
    expect(first.getByText(/chance the enemy takes it; losing it costs the plan 8\.2, showing it now lets/)).toBeVisible();
    expect(first.getByTitle("Mars")).toBeVisible();
    expect(card("Mars").queryByText(/chance the enemy takes it/)).toBeNull();
  });

  it("labels a hero outside a player's pool, any hero for a seat without one, and an open seat", () => {
    renderLane();
    expect(card("Mars").getByText("Outside Pool")).toBeVisible();
    expect(card("Dazzle").getByText("Any Hero")).toBeVisible();
    expect(card("Dazzle").getByText("Open Seat")).toBeVisible();
    expect(card("Invoker").queryByText(/Outside Pool|Any Hero/)).toBeNull();
  });

  it("picks, bans and takes back a hero for the planner", async () => {
    const onPicked = vi.fn();
    const onBanned = vi.fn();
    const onUndo = vi.fn();
    renderLane({ onPicked, onBanned, onUndo });
    await userEvent.click(card("Mars").getByRole("button", { name: "Picked" }));
    expect(onPicked).toHaveBeenCalledWith(129, 3);
    await userEvent.click(card("Mars").getByRole("button", { name: "Banned Mars" }));
    expect(onBanned).toHaveBeenCalledWith(129);
    // A picked hero says so, with Undo next to it.
    expect(card("Juggernaut").getByText("Picked")).toBeVisible();
    expect(card("Juggernaut").queryByRole("button", { name: "Picked" })).toBeNull();
    await userEvent.click(card("Juggernaut").getByRole("button", { name: "Undo Juggernaut" }));
    expect(onUndo).toHaveBeenCalledWith(8);
  });

  it("shows the plan without buttons to players watching the planner", () => {
    renderLane();
    expect(screen.queryByRole("button", { name: /Picked|Banned|Undo/ })).toBeNull();
    expect(card("Juggernaut").getByText("Picked")).toBeVisible();
  });

  it("branches into Another Super Team with the heroes that differ, and shows its why on demand", async () => {
    renderLane();
    const branch = within(screen.getByRole("region", { name: "Another Super Team" }));
    expect(branch.getByText("−12.3")).toBeVisible();
    expect(branch.getByText("Weaker against the enemy picks (−3.9)")).toBeVisible();
    const differ = within(branch.getByRole("list", { name: "Heroes That Differ" }));
    expect(differ.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Pos 2Puck", "Pos 3Axe", "Pos 5Lion"]);
    expect(branch.queryByText(/win more together/)).toBeNull();
    await userEvent.click(branch.getByRole("button", { name: "Show Why" }));
    expect(branch.getByRole("button", { name: "Hide Why" })).toHaveAttribute("aria-expanded", "true");
    expect(branch.getByText(/win more together/)).toBeVisible();
    // Only the needs that differ from the plan: both cover a stun, both lack a save.
    expect(branch.getByText("Covers the same team needs as the plan.")).toBeVisible();
  });

  it("leaves out Another Super Team once every hero is picked", () => {
    renderLane({
      plan: {
        ...plan,
        slots: plan.slots.map((s) => ({ ...s, locked: true })),
        pickFirst: null,
      },
    });
    expect(screen.queryByRole("region", { name: "Another Super Team" })).toBeNull();
  });
});

describe("SuperTeamPanel", () => {
  it("shows the style, the Pair Frames and the team needs, missing ones in amber", () => {
    render(<SuperTeamPanel plan={plan} hero={hero} enemies={[11, 14]} />);
    const panel = within(screen.getByRole("region", { name: "Why This Is a Super Team" }));
    expect(panel.getByText("Teamfight")).toBeVisible();
    expect(panel.getByText("Group up and win the big fights with your ultimates.")).toBeVisible();
    expect(panel.getByText("Best Pair")).toBeVisible();
    expect(panel.getByText("+2.1")).toBeVisible();
    expect(panel.getByText("Snapfire and Dazzle")).toBeVisible();
    expect(panel.getByText("Against Enemy")).toBeVisible();
    expect(panel.getByText("+4.8")).toBeVisible();
    expect(panel.getByText("Most from Invoker against Shadow Fiend")).toBeVisible();
    expect(panel.getByText("Key Combo")).toBeVisible();
    expect(panel.getByText("Arena of Blood with Mortimer Kisses inside")).toBeVisible();
    // The second pair is still shown, as a line; the needs line is Team Needs' count.
    expect(within(panel.getByRole("list", { name: "More Reasons" })).getByText("+1.9")).toBeVisible();
    expect(panel.getByText("1 of 2")).toBeVisible();
    const save = panel.getByText("Save").closest("li")!;
    expect(save).toHaveClass("text-warn");
    expect(within(save).getByText("Missing")).toBeVisible();
    const stun = panel.getByText("Stun").closest("li")!;
    expect(within(stun).getByRole("img", { name: "Invoker" })).toBeInTheDocument();
  });

  it("names a plan without a style and leaves out tiles the data does not back", () => {
    render(
      <SuperTeamPanel
        plan={{
          ...plan,
          style: null,
          combos: [],
          why: [],
          gamePlan: "Balanced: no single style stands out, so play around your strongest heroes.",
        }}
        hero={hero}
        enemies={[]}
      />,
    );
    expect(screen.getByText("Balanced")).toBeVisible();
    expect(screen.getByText("No single style stands out, so play around your strongest heroes.")).toBeVisible();
    expect(screen.queryByText(/Best Pair|Against Enemy|Key Combo/)).toBeNull();
  });
});
