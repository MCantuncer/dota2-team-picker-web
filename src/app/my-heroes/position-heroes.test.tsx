import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Hero } from "@/lib/heroes";
import { PositionHeroes } from "./position-heroes";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

const hero = (id: number, name: string): Hero => ({
  id,
  name,
  image: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/${id}.png`,
  icon: "",
  primaryAttr: "agi",
  roles: [],
});
const heroes = [hero(114, "Monkey King"), hero(1, "Anti-Mage")];
const card = {
  id: "c1",
  heroId: 114,
  position: 1,
  question: "Add Monkey King to your carry heroes?",
  reason: "You won 86% of your last 7 Monkey King games as carry (pos 1).",
};
const show = () =>
  render(<PositionHeroes userId="u1" heroes={heroes} initialPositions={[]} initialHeroes={{}} suggestions={[card]} />);

describe("PositionHeroes suggestions", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: "accepted", error: null });
  });

  it("shows a suggestion on its position with the reason", () => {
    show();
    const row = screen.getByRole("group", { name: "From Your Games" });
    expect(row).toHaveTextContent(card.question);
    expect(row).toHaveTextContent(card.reason);
    expect(screen.getByLabelText("Suggestion from your games")).toBeInTheDocument();
  });

  it("Add Hero adds it to the position and turns the position on", async () => {
    show();
    await userEvent.click(within(screen.getByRole("group", { name: "From Your Games" })).getByRole("button", { name: "Add Hero" }));
    expect(rpc).toHaveBeenCalledWith("answer_pool_suggestion", { card: "c1", answer: "yes" });
    expect(screen.queryByRole("group", { name: "From Your Games" })).not.toBeInTheDocument();
    expect(screen.getByTitle("Remove Monkey King")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "I play Carry" })).toBeChecked();
  });

  it("No removes the suggestion without adding the hero", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "No" }));
    expect(rpc).toHaveBeenCalledWith("answer_pool_suggestion", { card: "c1", answer: "no" });
    expect(screen.queryByTitle("Remove Monkey King")).not.toBeInTheDocument();
  });

  it("keeps the suggestion and says so when the answer isn't saved", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    show();
    await userEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.getByRole("group", { name: "From Your Games" })).toBeInTheDocument();
    expect(screen.getByText("Could not save your answer. Please try again.")).toBeInTheDocument();
  });

  it("shows nothing on positions without suggestions", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: /^Mid/ }));
    expect(screen.queryByRole("group", { name: "From Your Games" })).not.toBeInTheDocument();
  });
});
