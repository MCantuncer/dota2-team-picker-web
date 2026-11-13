import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PartySeat } from "@/lib/party-seats";
import { PartySeats } from "./party-seats";

const seat = (position: 1 | 2 | 3 | 4 | 5, id: string, status: PartySeat["status"]): PartySeat => ({
  position,
  id,
  name: id,
  avatarUrl: null,
  status,
});

describe("PartySeats", () => {
  it("says how each player holds their seat, and counts who is waiting", () => {
    render(
      <PartySeats
        title="Can's Party"
        seats={[seat(1, "Deniz", "in"), seat(2, "me", "in"), seat(4, "Selin", "invited"), seat(5, "Mert", "away")]}
        userId="me"
        captainId="Deniz"
        hero={(id) => ({ name: `Hero ${id}`, image: `/hero-${id}.png` })}
        heroAt={(p) => (p === 5 ? 26 : null)}
      />,
    );
    const region = screen.getByRole("region", { name: "Team Seats" });
    expect(region).toHaveTextContent("Can's Party2 in Party, 2 Waiting");
    const seats = within(screen.getByRole("list", { name: "Seats" })).getAllByRole("listitem");
    expect(seats).toHaveLength(5);
    expect(seats[0]).toHaveTextContent("Deniz");
    expect(seats[0]).toHaveTextContent("Draft Captain");
    expect(seats[1]).toHaveTextContent("You");
    expect(seats[1]).toHaveTextContent("In Party");
    expect(seats[2]).toHaveTextContent(/Offlane\s*Open/);
    expect(seats[3]).toHaveTextContent("Invited");
    expect(seats[4]).toHaveTextContent("Not on Site");
    expect(within(seats[4]!).getByRole("img", { name: "Hero 26" })).toBeInTheDocument();
  });
});
