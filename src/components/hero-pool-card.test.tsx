import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeroPoolCard } from "./hero-pool-card";

const rpc = vi.fn();
const refresh = vi.fn();
let pathname = "/";
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }), usePathname: () => pathname }));

const card = {
  id: "c1",
  heroId: 114,
  position: 1,
  question: "Add Monkey King to your carry heroes?",
  reason: "You won 86% of your last 7 Monkey King games as carry (pos 1).",
};
const show = () => render(<HeroPoolCard card={card} heroName="Monkey King" heroImage={null} />);

describe("HeroPoolCard", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: "accepted", error: null });
    refresh.mockReset();
    pathname = "/";
  });

  it("asks the question with the player's own numbers, without taking focus", () => {
    show();
    expect(screen.getByRole("region", { name: card.question })).toBeInTheDocument();
    expect(screen.getByText(card.reason)).toBeInTheDocument();
    expect(screen.getByText("Yes also turns on carry in your positions.")).toBeInTheDocument();
    expect(document.activeElement).toBe(document.body);
  });

  it("Yes adds the hero and says so", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "Add Hero" }));
    expect(rpc).toHaveBeenCalledWith("answer_pool_suggestion", { card: "c1", answer: "yes" });
    expect(screen.getByRole("heading")).toHaveTextContent("Monkey King is in your carry heroes");
  });

  it("Yes refreshes My Heroes when open there", async () => {
    pathname = "/my-heroes";
    show();
    await userEvent.click(screen.getByRole("button", { name: "Add Hero" }));
    expect(refresh).toHaveBeenCalled();
  });

  it("No closes the card", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "No" }));
    expect(rpc).toHaveBeenCalledWith("answer_pool_suggestion", { card: "c1", answer: "no" });
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("the close button and Escape mean later, never No", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "Ask me later" }));
    expect(rpc).toHaveBeenLastCalledWith("answer_pool_suggestion", { card: "c1", answer: "later" });

    rpc.mockClear();
    const { unmount } = show();
    await userEvent.tab();
    await userEvent.keyboard("{Escape}");
    expect(rpc).toHaveBeenCalledWith("answer_pool_suggestion", { card: "c1", answer: "later" });
    unmount();
  });

  it("keeps the card and says so when the answer isn't saved", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    show();
    await userEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Your answer wasn't saved. Try again.");
    expect(screen.getByRole("button", { name: "No" })).toBeEnabled();
  });

  it("stays away from the draft and sign in pages", () => {
    pathname = "/draft";
    show();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
