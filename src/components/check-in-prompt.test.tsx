import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DueCheckIn } from "@/lib/game-check-in";
import { CheckInPrompt } from "./check-in-prompt";

const rpc = vi.fn();
let pathname = "/";
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const game: DueCheckIn = {
  id: "g1",
  allies: [8, 128, 74, 129, 5],
  enemies: [14, 11, 26, 2, 44],
  myHero: 74,
  myPosition: 2,
  storyShown: true,
  matchId: null,
  won: null,
};
const show = (g: DueCheckIn = game) => render(<CheckInPrompt game={g} heroName="Invoker" heroImage={null} />);

describe("CheckInPrompt", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
    pathname = "/";
  });

  it("shows a found result and saves the picks in one tap", async () => {
    show({ ...game, matchId: 8012345678, won: true });
    expect(screen.getByRole("heading", { name: "Victory" })).toBeInTheDocument();
    expect(screen.getByText("Invoker, Mid")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Defeat" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Good" }));
    expect(rpc).toHaveBeenCalledWith("answer_check_in", { check_in: "g1", played: true, picks: "good" });
    expect(screen.getByRole("status")).toHaveTextContent("Thanks.");
  });

  it("without a result asks who won first", async () => {
    show();
    expect(screen.getByRole("heading", { name: "How Did It Go?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Okay" }));
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Tell us if you won or lost first.");
    await userEvent.click(screen.getByRole("button", { name: "Defeat" }));
    await userEvent.click(screen.getByRole("button", { name: "Bad" }));
    expect(rpc).toHaveBeenCalledWith("answer_check_in", { check_in: "g1", played: true, picks: "bad", did_win: false });
  });

  it("Not Now snoozes it and Didn't Play It closes it", async () => {
    const { unmount } = show();
    await userEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(rpc).toHaveBeenCalledWith("snooze_check_in", { check_in: "g1" });
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    unmount();
    show();
    await userEvent.click(screen.getByRole("button", { name: "Didn't Play It" }));
    expect(rpc).toHaveBeenCalledWith("answer_check_in", { check_in: "g1", played: false });
  });

  it("keeps the card when saving fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    show({ ...game, won: false, matchId: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Good" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Your answer wasn't saved. Try again.");
  });

  it("the site-wide card stays off the Draft page, which shows its own and hears when it is done", async () => {
    pathname = "/draft";
    const { unmount } = show();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    unmount();
    const onDone = vi.fn();
    render(<CheckInPrompt game={game} heroName="Invoker" heroImage={null} isOnDraft onDone={onDone} />);
    expect(screen.getByRole("region", { name: "How Did It Go?" })).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onDone).toHaveBeenCalledOnce();
  });
});
