import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { steamAvatar } from "@/lib/party";

/** Where a party invite link points. `/join` is taken by team invites. */
export const PARTY_LINK_PATH = "/invite";

/** The database makes codes of 8 random bytes in hex. */
const CODE_PATTERN = /^[0-9a-f]{16}$/;

/** True when a URL parameter can be an invite code; anything else is refused before any query. */
export const isPartyLinkCode = (code: string) => CODE_PATTERN.test(code);

export const partyLinkUrl = (origin: string, code: string) => `${origin}${PARTY_LINK_PATH}/${code}`;

/** The leader's invite link. It works until `expiresAt`, and each fetch pushes that 24 hours on. */
export interface PartyLink {
  code: string;
  expiresAt: string;
}

export type PartyLinkResult = { link: PartyLink; error: null } | { link: null; error: string };

/**
 * Gets the invite link of your party, making one if needed (party leader only). `fresh` replaces
 * it, so the old link stops working.
 */
export async function fetchPartyLink(supabase: SupabaseClient<Database>, fresh = false): Promise<PartyLinkResult> {
  const { data, error } = await supabase.rpc("party_link", { fresh });
  if (error) return { link: null, error: error.message };
  const row = data[0];
  if (!row) return { link: null, error: "No invite link came back" };
  return { link: { code: row.code, expiresAt: row.expires_at }, error: null };
}

/** The party behind an invite link, as the invite page shows it. */
export interface LinkedParty {
  id: string;
  leaderId: string;
  leaderName: string;
  leaderAvatarUrl: string | null;
  members: number;
  isMember: boolean;
  isKicked: boolean;
}

/** Looks up a live invite link. Null when it's unknown, expired or the party closed. Throws when the query fails. */
export async function partyByLink(supabase: SupabaseClient<Database>, code: string): Promise<LinkedParty | null> {
  const { data, error } = await supabase.rpc("party_by_link", { code });
  if (error) throw error;
  const row = data[0];
  if (!row) return null;
  return {
    id: row.party_id,
    leaderId: row.leader_id,
    leaderName: row.leader_name ?? "Unnamed",
    leaderAvatarUrl: steamAvatar(row.leader_avatar_url),
    members: row.members,
    isMember: row.is_member,
    isKicked: row.is_kicked,
  };
}
