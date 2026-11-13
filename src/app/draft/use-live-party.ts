"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RankBracket } from "@/lib/engine/types";
import { toParty, type Party } from "@/lib/party";
import { toPartyStats, type HeroPool, type PartyPlayer } from "@/lib/party-plan";
import { toSeatedPlayers, type SeatedPlayer } from "@/lib/party-seats";
import { createClient } from "@/lib/supabase/client";

/** How often the party's heroes are loaded again while the draft screen is open. */
const STATS_RELOAD_MS = 60_000;
/** How often the seats are read again while an invite pop-up is live, so Invited turns into Not on Site. */
const INVITE_RELOAD_MS = 30_000;

/**
 * The party on the draft screen, kept live: who is in it, their positions, the players seated who
 * haven't joined, the draft captain and the party rank. Also loads every member's and seated player's
 * favorite heroes, rank and match stats, which the database gives to everyone in the party, so the
 * whole Draft Room sees the planner's numbers.
 */
export function useLiveParty(initial: Party | null, initialSeated: SeatedPlayer[] = []) {
  const supabase = useMemo(() => createClient(), []);
  const [party, setParty] = useState(initial);
  const [seated, setSeated] = useState(initialSeated);
  const [partyRank, setPartyRank] = useState<RankBracket | null>(null);
  const [stats, setStats] = useState<{ pool: HeroPool; players: Record<string, PartyPlayer> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const partyId = initial?.id ?? null;

  const refresh = useCallback(async () => {
    const [view, seats, row] = await Promise.all([
      supabase.rpc("party_view"),
      supabase.rpc("party_seats_view"),
      partyId ? supabase.from("parties").select("rank_bracket").eq("id", partyId).maybeSingle() : null,
    ]);
    if (view.error) return setError(`Party not loaded: ${view.error.message}`);
    if (seats.error) return setError(`Party seats not loaded: ${seats.error.message}`);
    if (row?.error) return setError(`Party rank not loaded: ${row.error.message}`);
    setParty(toParty(view.data));
    setSeated(toSeatedPlayers(seats.data));
    setPartyRank((row?.data?.rank_bracket as RankBracket | null | undefined) ?? null);
    setError(null);
  }, [supabase, partyId]);

  // The party rank is not in party_view, so it is read once here and again on every change.
  useEffect(() => {
    if (!partyId) return;
    let current = true;
    supabase
      .from("parties")
      .select("rank_bracket")
      .eq("id", partyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!current) return;
        if (error) setError(`Party rank not loaded: ${error.message}`);
        else setPartyRank((data?.rank_bracket as RankBracket | null | undefined) ?? null);
      });
    return () => {
      current = false;
    };
  }, [supabase, partyId]);

  // The captain or the rank changing, a request opening, players joining, leaving or moving position,
  // and seats or invites changing.
  useEffect(() => {
    if (!partyId) return;
    const channel = supabase
      .channel(`draft-party:${partyId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "parties", filter: `id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "party_seats", filter: `party_id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "party_seats", filter: `party_id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "party_invites", filter: `party_id=eq.${partyId}` }, refresh)
      // Realtime can't filter deletes, so they are checked here.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "party_members" }, (change) => {
        if ((change.old as { party_id?: string }).party_id === partyId) refresh();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "party_seats" }, (change) => {
        if ((change.old as { party_id?: string }).party_id === partyId) refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, partyId, refresh]);

  // An invite pop-up runs out after 15 minutes without a database change, so read the seats again meanwhile.
  const inviteLive = seated.some((s) => s.inviteLive);
  useEffect(() => {
    if (!inviteLive) return;
    const timer = setInterval(() => void refresh(), INVITE_RELOAD_MS);
    return () => clearInterval(timer);
  }, [inviteLive, refresh]);

  // Everyone's heroes and stats, loaded again whenever someone joins, leaves or is seated, when this tab
  // comes back into view, and every minute, so a member who edits My Heroes mid-party is planned with them.
  const memberKey = [...(party?.members ?? []), ...seated]
    .map((m) => m.id)
    .sort()
    .join(",");
  useEffect(() => {
    if (!memberKey) return;
    let current = true;
    const load = () =>
      supabase.rpc("party_player_stats").then(({ data, error }) => {
        if (!current) return;
        if (error) {
          setStats(null);
          setError(`Could not load your party's heroes: ${error.message}`);
        } else setStats(toPartyStats(data ?? []));
      });
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    const timer = setInterval(onVisible, STATS_RELOAD_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase, memberKey]);

  const planner = party ? (party.captain.id ?? party.leaderId) : null;
  return { party, seated, planner, partyRank, pool: stats?.pool ?? null, players: stats?.players ?? {}, error, refresh };
}
