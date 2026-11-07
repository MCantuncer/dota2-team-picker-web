import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type FillAdded, FillButton, FillCard, FillProvider, type FillRow } from "./hero-fill";

const invoke = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ functions: { invoke } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const row = (r: Partial<FillRow>): FillRow => ({
  hero_fill_state: null,
  hero_fill_at: null,
  hero_fill_games: null,
  hero_fill_next_at: null,
  ...r,
});
const NONE: FillAdded = { count: 0, heroes: [] };
const added: FillAdded = {
  count: 16,
  heroes: [{ id: 76, name: "Outworld Devourer", image: "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/od.png" }],
};
const show = (r: FillRow, a = NONE, steamLinked = true) =>
  render(
    <FillProvider row={r} steamLinked={steamLinked}>
      <FillCard added={a} />
      <FillButton />
    </FillProvider>,
  );

describe("My Heroes fill", () => {
  beforeEach(() => {
    invoke.mockReset();
    refresh.mockReset();
    invoke.mockResolvedValue({ data: { claimed: true, state: "done", added: 16 }, error: null });
    localStorage.clear();
  });

  it("fills a player on their first visit and reloads the lists after", async () => {
    show(row({}));
    expect(screen.getByRole("heading", { name: "Reading Your Games" })).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith("fill-heroes", { body: { by: "welcome" } });
    await act(async () => {});
    expect(refresh).toHaveBeenCalled();
  });

  it("does not fill without a Steam account", () => {
    show(row({}), NONE, false);
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Fill from My Games" })).not.toBeInTheDocument();
  });

  it("says what the fill added and can hide that card", async () => {
    show(row({ hero_fill_state: "done", hero_fill_at: minutesAgo(5), hero_fill_games: 835 }), added);
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "16 Heroes Added from Your Games" })).toBeInTheDocument();
    expect(screen.getByText(/games with a known position/)).toHaveTextContent(
      "From 835 games with a known position in the last 6 months. Remove any you don't want.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Hide this card" }));
    expect(screen.queryByRole("heading", { name: /Added from Your Games/ })).not.toBeInTheDocument();
  });

  it("rests the button for a day after a fill", () => {
    show(row({ hero_fill_state: "done", hero_fill_at: minutesAgo(5), hero_fill_games: 835 }), added);
    expect(screen.getByRole("button", { name: "Fill from My Games" })).toBeDisabled();
    expect(screen.getByText(/^Again (tomorrow )?at \d\d:\d\d$/)).toBeInTheDocument();
  });

  it("runs again from the button once rested", async () => {
    show(row({ hero_fill_state: "done", hero_fill_at: minutesAgo(25 * 60), hero_fill_games: 835 }), added);
    await userEvent.click(screen.getByRole("button", { name: "Fill from My Games" }));
    expect(invoke).toHaveBeenCalledWith("fill-heroes", { body: { by: "button" } });
  });

  it("explains private match data, with the button on the card only", () => {
    show(row({ hero_fill_state: "no_games", hero_fill_at: minutesAgo(30), hero_fill_games: 0 }));
    expect(screen.getByRole("heading", { name: "No Public Games Found" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Fill from My Games" })).toHaveLength(1);
  });

  it("shows how many games had a position when too few did", () => {
    show(row({ hero_fill_state: "too_few", hero_fill_at: minutesAgo(30), hero_fill_games: 12 }));
    expect(screen.getByRole("heading", { name: "Not Enough Games Yet" })).toBeInTheDocument();
    expect(screen.getByText(/We found/)).toHaveTextContent("We found 12 games with a known position and need 20.");
  });

  it("tells a waiting player it will try again, with the button resting", () => {
    show(row({ hero_fill_state: "waiting", hero_fill_at: minutesAgo(2), hero_fill_next_at: new Date(Date.now() + 28 * 60_000).toISOString() }));
    expect(screen.getByRole("heading", { name: "Couldn't Read Your Games Right Now" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fill from My Games" })).toBeDisabled();
  });

  it("offers a new try after the last one failed", () => {
    show(row({ hero_fill_state: "failed", hero_fill_at: minutesAgo(30) }));
    expect(screen.getByRole("heading", { name: "Couldn't Read Your Games" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fill from My Games" })).toBeEnabled();
  });

  it("says so when the fill could not start", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("network") });
    show(row({}));
    await act(async () => {});
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't start reading your games.");
  });
});
