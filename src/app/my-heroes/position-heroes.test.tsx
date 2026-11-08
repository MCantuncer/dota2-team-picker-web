import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Hero } from "@/lib/heroes";
import { NO_SUPPORT_COPY, type SupportCopy } from "@/lib/support-copy";
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
    expect(screen.getByRole("button", { name: /^Remove Monkey King from / })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Use in drafts" })).toBeChecked();
  });

  it("No removes the suggestion without adding the hero", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "No" }));
    expect(rpc).toHaveBeenCalledWith("answer_pool_suggestion", { card: "c1", answer: "no" });
    expect(screen.queryByRole("button", { name: /^Remove Monkey King from / })).not.toBeInTheDocument();
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
    await userEvent.click(screen.getByRole("button", { name: /Mid/ }));
    expect(screen.queryByRole("group", { name: "From Your Games" })).not.toBeInTheDocument();
  });
});

describe("PositionHeroes Support Copy", () => {
  const lists = (four: number[], five: number[], copy: "on" | "off" | null, from: 4 | 5 | null) => ({
    data: { heroes: { "4": four, "5": five }, support_copy: copy, support_copy_from: from },
    error: null,
  });
  const showSupport = (initialHeroes: Record<number, number[]> = {}, copy: SupportCopy = NO_SUPPORT_COPY) =>
    render(
      <PositionHeroes userId="u1" heroes={heroes} initialPositions={[4]} initialHeroes={initialHeroes} initialSupportCopy={copy} />,
    );

  beforeEach(() => rpc.mockReset());

  it("saves through set_favorite_hero and shows the copy on Pos 5", async () => {
    rpc.mockResolvedValue(lists([114], [114], "on", 4));
    showSupport();
    await userEvent.click(screen.getByRole("button", { name: "Monkey King" }));
    expect(rpc).toHaveBeenCalledWith("set_favorite_hero", { hero_position: 4, hero: 114, is_on: true });
    expect(screen.getByText("Pos 5 gets the same heroes. Change Pos 5 any time to make it its own list.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Hard Support/ }));
    expect(screen.getByRole("button", { name: /^Remove Monkey King from / })).toBeInTheDocument();
    expect(screen.getByText("Copied from Pos 4. Change this list any time to make it its own.")).toBeInTheDocument();
  });

  it("Stop Copying keeps both lists and hides the note", async () => {
    rpc.mockResolvedValue(lists([114], [114], "off", null));
    showSupport({ 4: [114], 5: [114] }, { state: "on", from: 4 });
    await userEvent.click(screen.getByRole("button", { name: "Stop Copying" }));
    expect(rpc).toHaveBeenCalledWith("stop_support_copy");
    expect(screen.queryByText(/gets the same heroes/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Remove Monkey King from / })).toBeInTheDocument();
  });

  it("says so and keeps the lists when the change isn't saved", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    showSupport();
    await userEvent.click(screen.getByRole("button", { name: "Monkey King" }));
    expect(screen.getByText("Could not save Monkey King. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/gets the same heroes/)).not.toBeInTheDocument();
  });
});
