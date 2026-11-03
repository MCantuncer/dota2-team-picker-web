/** Only Steam avatars are shown; anything else in avatar_url is ignored. */
const STEAM_AVATAR = "https://avatars.steamstatic.com/";
export const steamAvatar = (url: string | null) => (url?.startsWith(STEAM_AVATAR) ? url : null);

export const PARTY_SIZE = 5;

export const POSITION_NAMES: Record<number, string> = {
  1: "Carry",
  2: "Mid",
  3: "Offlane",
  4: "Soft Support",
  5: "Hard Support",
};

/** How soon a player can ask for draft captain again, counted from their last ask (matches the database). */
export const CAPTAIN_ASK_COOLDOWN_MS = 60_000;

export interface PartyMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  position: number | null;
  /** Milliseconds until this player may ask for draft captain again; 0 when they can now. */
  askWaitMs: number;
}

/** The draft captain and an open request for the role. */
export interface PartyCaptain {
  /** The draft captain, or null when anyone in the party can enter the draft. */
  id: string | null;
  /** Whether the captain had a page of the site open lately. A hint: the database decides. */
  online: boolean;
  /** Who asked the captain for the role, while the request is open. */
  requestBy: string | null;
  /** Milliseconds left on the open request when it was read, by the database clock. */
  requestMsLeft: number;
}

export interface Party {
  id: string;
  leaderId: string;
  /** The Stack this party was started for, if any. */
  teamId: string | null;
  captain: PartyCaptain;
  members: PartyMember[];
}

const str = (v: unknown) => (typeof v === "string" ? v : null);
const time = (v: unknown) => {
  const t = Date.parse(str(v) ?? "");
  return Number.isNaN(t) ? null : t;
};

/**
 * Turns the rows of the party_view() database function into one party, or null when not in one.
 * Times are turned into "milliseconds left" against the database's own clock (server_now), so a
 * browser with a wrong clock still counts down correctly.
 */
export function toParty(rows: Record<string, unknown>[] | null): Party | null {
  const first = rows?.[0];
  if (!rows || !first) return null;
  const now = time(first.server_now) ?? Date.now();
  const expires = time(first.captain_request_expires_at);
  const requestBy = expires !== null ? str(first.captain_request_by) : null;
  return {
    id: first.party_id as string,
    leaderId: first.leader_id as string,
    teamId: str(first.team_id),
    captain: {
      id: str(first.captain_id),
      online: first.captain_online === true,
      requestBy,
      requestMsLeft: requestBy && expires !== null ? Math.max(0, expires - now) : 0,
    },
    members: rows.map((r) => {
      const asked = time(r.captain_asked_at);
      return {
        id: r.user_id as string,
        name: (r.display_name as string | null) ?? "Unnamed",
        avatarUrl: steamAvatar(r.avatar_url as string | null),
        position: (r.position as number | null) ?? null,
        askWaitMs: asked === null ? 0 : Math.max(0, asked + CAPTAIN_ASK_COOLDOWN_MS - now),
      };
    }),
  };
}
