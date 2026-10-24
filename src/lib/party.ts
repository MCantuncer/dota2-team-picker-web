/** Only Steam avatars are shown; anything else in avatar_url is ignored. */
const STEAM_AVATAR = "https://avatars.steamstatic.com/";
export const steamAvatar = (url: string | null) => (url?.startsWith(STEAM_AVATAR) ? url : null);

export const PARTY_SIZE = 5;

export const POSITION_NAMES: Record<number, string> = {
  1: "Carry",
  2: "Mid",
  3: "Offlane",
  4: "Soft support",
  5: "Hard support",
};

export interface PartyMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  position: number | null;
}

export interface Party {
  id: string;
  leaderId: string;
  members: PartyMember[];
}

/** Turns the rows of the party_view() database function into one party, or null when not in one. */
export function toParty(rows: Record<string, unknown>[] | null): Party | null {
  if (!rows?.length) return null;
  return {
    id: rows[0]!.party_id as string,
    leaderId: rows[0]!.leader_id as string,
    members: rows.map((r) => ({
      id: r.user_id as string,
      name: (r.display_name as string | null) ?? "Unnamed",
      avatarUrl: steamAvatar(r.avatar_url as string | null),
      position: (r.position as number | null) ?? null,
    })),
  };
}
