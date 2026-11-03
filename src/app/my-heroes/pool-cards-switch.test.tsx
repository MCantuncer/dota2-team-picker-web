import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PoolCardsSwitch } from "./pool-cards-switch";

const rpc = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("PoolCardsSwitch", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
    refresh.mockReset();
  });

  it("turns suggestions off and reloads the page's cards", async () => {
    render(<PoolCardsSwitch initialOn gamesHidden={false} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Suggest heroes from my recent games" }));
    expect(rpc).toHaveBeenCalledWith("set_pool_suggestions_off", { is_off: true });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(refresh).toHaveBeenCalled();
  });

  it("explains why there are no suggestions when the games are hidden", () => {
    render(<PoolCardsSwitch initialOn gamesHidden />);
    expect(screen.getByText(/can't see your recent games/)).toBeInTheDocument();
  });

  it("stays as it was when the change isn't saved", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    render(<PoolCardsSwitch initialOn={false} gamesHidden={false} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save that.");
  });
});
