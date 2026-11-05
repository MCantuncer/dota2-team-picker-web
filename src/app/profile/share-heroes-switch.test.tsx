import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareHeroesSwitch } from "./share-heroes-switch";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

describe("ShareHeroesSwitch", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it("turns sharing off and says friends still can add you", async () => {
    render(<ShareHeroesSwitch initialOn />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Share My Heroes With Friends" }));
    expect(rpc).toHaveBeenCalledWith("set_share_heroes_with_friends", { is_on: false });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText(/planned as if you can play any hero/)).toBeInTheDocument();
  });

  it("turns sharing back on", async () => {
    render(<ShareHeroesSwitch initialOn={false} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(rpc).toHaveBeenCalledWith("set_share_heroes_with_friends", { is_on: true });
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("goes back to the saved value when the change isn't saved", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    render(<ShareHeroesSwitch initialOn />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save that.");
  });
});
