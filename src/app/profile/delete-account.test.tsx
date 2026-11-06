import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteAccount } from "./delete-account";

const deleteAccount = vi.fn();
vi.mock("./actions", () => ({ deleteAccount: (...args: unknown[]) => deleteAccount(...args) }));

describe("DeleteAccount", () => {
  beforeEach(() => {
    deleteAccount.mockReset();
    deleteAccount.mockResolvedValue(null);
  });

  it("asks the player to type delete before it can go", async () => {
    render(<DeleteAccount />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    const confirm = screen.getByRole("button", { name: "Delete My Account" });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/to confirm/), "Delete");
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(deleteAccount).toHaveBeenCalledOnce();
    expect((deleteAccount.mock.calls[0][1] as FormData).get("confirm")).toBe("Delete");
  });

  it("goes back without deleting on Cancel", async () => {
    render(<DeleteAccount />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    await userEvent.type(screen.getByLabelText(/to confirm/), "delete");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(deleteAccount).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    expect(screen.getByLabelText(/to confirm/)).toHaveValue("");
  });

  it("shows why when the account could not be deleted", async () => {
    deleteAccount.mockResolvedValue("Could not delete your account. Please try again.");
    render(<DeleteAccount />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    await userEvent.type(screen.getByLabelText(/to confirm/), "delete");
    await userEvent.click(screen.getByRole("button", { name: "Delete My Account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete your account.");
  });
});
