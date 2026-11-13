import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Party } from "@/lib/party";
import { PartyPanel } from "./party-panel";

const rpc = vi.fn();
const refreshPage = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshPage }) }));

const party = (captainId: string | null, online = true): Party => ({
  id: "p",
  leaderId: "can",
  teamId: null,
  captain: { id: captainId, online, requestBy: null, requestMsLeft: 0 },
  members: [
    { id: "can", name: "Can", avatarUrl: null, position: 2, askWaitMs: 0 },
    { id: "deniz", name: "Deniz", avatarUrl: null, position: 1, askWaitMs: 0 },
  ],
});

function setup(p: Party, userId: string) {
  const refresh = vi.fn().mockResolvedValue(undefined);
  render(
    <PartyPanel
      party={p}
      seats={[
        { position: 1, id: "deniz", name: "Deniz", avatarUrl: null, status: "in" },
        { position: 2, id: "can", name: "Can", avatarUrl: null, status: "in" },
      ]}
      userId={userId}
      hero={() => ({ name: "" })}
      heroAt={() => null}
      refresh={refresh}
    />,
  );
  return refresh;
}

describe("PartyPanel", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ error: null });
    refreshPage.mockReset();
  });

  it("names the party after its leader and lets a member ask the captain", async () => {
    setup(party("can"), "deniz");
    expect(screen.getByRole("region", { name: "Team Seats" })).toHaveTextContent("Can's Party2 in Party");
    await userEvent.click(screen.getByRole("button", { name: "Ask Can for Captain" }));
    expect(rpc).toHaveBeenCalledWith("become_captain");
  });

  it("leaves the party and loads the page again as the player's own draft", async () => {
    setup(party(null), "can");
    await userEvent.click(screen.getByRole("button", { name: "Leave Party" }));
    expect(rpc).toHaveBeenCalledWith("leave_party");
    expect(refreshPage).toHaveBeenCalled();
  });

  it("shows a failed leave and stays", async () => {
    rpc.mockResolvedValue({ error: { message: "network down" } });
    setup(party(null), "can");
    await userEvent.click(screen.getByRole("button", { name: "Leave Party" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not leave: network down");
    expect(refreshPage).not.toHaveBeenCalled();
  });
});
