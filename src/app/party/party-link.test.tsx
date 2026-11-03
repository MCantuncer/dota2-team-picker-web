import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PartyLinkResult } from "@/lib/party-link";
import { PartyLinkCard } from "./party-link";

const live = { code: "0123456789abcdef", expiresAt: "2999-01-01T00:00:00Z" };
const ok = (code: string): PartyLinkResult => ({ link: { code, expiresAt: "2999-01-01T00:00:00Z" }, error: null });

describe("PartyLinkCard", () => {
  it("copies the link and keeps it alive", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const getLink = vi.fn().mockResolvedValue(ok(live.code));
    render(<PartyLinkCard initialLink={live} isFull={false} getLink={getLink} />);

    expect(screen.getByLabelText("Party invite link")).toHaveValue(`${window.location.origin}/invite/${live.code}`);
    await user.click(screen.getByRole("button", { name: "Copy Link" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/invite/${live.code}`);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(getLink).toHaveBeenCalledWith(false);
  });

  it("makes a new link that replaces the old one", async () => {
    const getLink = vi.fn().mockResolvedValue(ok("fedcba9876543210"));
    render(<PartyLinkCard initialLink={live} isFull={false} getLink={getLink} />);
    await userEvent.click(screen.getByRole("button", { name: "New Link" }));
    expect(getLink).toHaveBeenCalledWith(true);
    expect(await screen.findByDisplayValue(/fedcba9876543210$/)).toBeInTheDocument();
  });

  it("loads the link when it has none, and offers a retry when that fails", async () => {
    const getLink = vi
      .fn()
      .mockResolvedValueOnce({ link: null, error: "network down" })
      .mockResolvedValueOnce(ok(live.code));
    render(<PartyLinkCard initialLink={null} isFull={false} getLink={getLink} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Invite link not loaded: network down");
    await userEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(await screen.findByDisplayValue(new RegExp(`${live.code}$`))).toBeInTheDocument();
  });

  it("hides the link while the party is full", () => {
    render(<PartyLinkCard initialLink={live} isFull getLink={vi.fn()} />);
    expect(screen.queryByLabelText("Party invite link")).not.toBeInTheDocument();
    expect(screen.getByText(/The party is full/)).toBeInTheDocument();
  });
});
