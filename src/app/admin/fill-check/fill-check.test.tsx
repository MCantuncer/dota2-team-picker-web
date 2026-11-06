import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleReport } from "@/lib/fill-check.sample";
import { FillCheck } from "./fill-check";

const invoke = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ functions: { invoke } }) }));

const show = () => render(<FillCheck heroNames={{ 94: "Medusa", 1: "Anti-Mage" }} />);

describe("FillCheck", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({ data: sampleReport(), error: null });
  });

  it("runs a dry run on the admin's own games and shows the result", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "Run Dry Run" }));
    expect(invoke).toHaveBeenCalledWith("fill-heroes", { body: { dry_run: true } });
    expect(await screen.findByText(/^Go: 92% of games/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Would Add" })).toHaveTextContent("Medusa");
    expect(screen.getByRole("region", { name: "Would Add" })).toHaveTextContent("55 games, 26 won (47%), 20 of 50 strong, needed 12");
    expect(screen.getByRole("region", { name: "Near Misses" })).toHaveTextContent("18 of 19 games");
  });

  it("sends a user id when one is given and refuses one that isn't", async () => {
    show();
    const input = screen.getByLabelText("Player");
    await userEvent.type(input, "not an id");
    await userEvent.click(screen.getByRole("button", { name: "Run Dry Run" }));
    expect(screen.getByRole("alert")).toHaveTextContent("That is not a user id");
    expect(invoke).not.toHaveBeenCalled();
    await userEvent.clear(input);
    await userEvent.type(input, "0b6f2c1e-1d2a-4c3b-9e8f-7a6b5c4d3e2f");
    await userEvent.click(screen.getByRole("button", { name: "Run Dry Run" }));
    expect(invoke).toHaveBeenCalledWith("fill-heroes", { body: { dry_run: true, user_id: "0b6f2c1e-1d2a-4c3b-9e8f-7a6b5c4d3e2f" } });
  });

  it("shows a plain message when the run fails", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Admins only") });
    show();
    await userEvent.click(screen.getByRole("button", { name: "Run Dry Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The dry run did not finish");
  });
});
