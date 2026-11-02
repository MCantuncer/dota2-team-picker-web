"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toParty, type Party } from "@/lib/party";
import { toHeroPool, type HeroPool } from "@/lib/party-plan";
import { createClient } from "@/lib/supabase/client";

/**
 * The party on the draft screen, kept live: who is in it, their positions and the draft captain.
 * Also loads the party's favorite heroes for whoever plans the team: the captain, or the leader
 * while nobody is captain. The database only gives them to that player.
 */
export function useLiveParty(initial: Party | null, userId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [party, setParty] = useState(initial);
  const [pool, setPool] = useState<HeroPool | null>(null);
  const [error, setError] = useState<string | null>(null);
  const partyId = initial?.id ?? null;

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("party_view");
    if (error) return setError(`Party not loaded: ${error.message}`);
    setParty(toParty(data));
    setError(null);
  }, [supabase]);

  // The captain changing or a request opening, and players joining, leaving or moving position.
  useEffect(() => {
    if (!partyId) return;
    const channel = supabase
      .channel(`draft-party:${partyId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "parties", filter: `id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` }, refresh)
      // Realtime can't filter deletes, so they are checked here.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "party_members" }, (change) => {
        if ((change.old as { party_id?: string }).party_id === partyId) refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, partyId, refresh]);

  const planner = party ? (party.captain.id ?? party.leaderId) : null;
  const plansTeam = planner !== null && planner === userId;
  useEffect(() => {
    if (!plansTeam) return;
    let current = true;
    supabase.rpc("party_hero_pool").then(({ data, error }) => {
      if (!current) return;
      if (error) {
        setPool(null);
        setError(`Could not load your party's heroes: ${error.message}`);
      } else setPool(toHeroPool(data ?? []));
    });
    return () => {
      current = false;
    };
  }, [supabase, plansTeam]);

  // A pool loaded earlier is dropped as soon as someone else plans the team.
  return { party, pool: plansTeam ? pool : null, error, refresh };
}
