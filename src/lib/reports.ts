import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type Facts, readFacts } from "./report-facts";

/** A draft id as the URL carries it. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReportStatus = "waiting_parse" | "ready" | "basic" | "failed";

/** A post-game report as its page shows it. `facts` is null until the first build, or when unreadable. */
export interface Report {
  draftId: string;
  matchId: number;
  status: ReportStatus;
  facts: Facts | null;
  /** True when facts were saved but this site can't read their version. */
  isUnreadable: boolean;
  updatedAt: string;
}

const STATUSES: ReportStatus[] = ["waiting_parse", "ready", "basic", "failed"];

/**
 * The report of a draft the signed-in player played, or null when there is none (no match yet, not
 * their game, or not a draft id). The database decides who may read it. Throws on a database error.
 */
export async function getReport(supabase: SupabaseClient<Database>, draftId: string): Promise<Report | null> {
  if (!UUID.test(draftId)) return null;
  const { data, error } = await supabase
    .from("match_reports")
    .select("draft_id, match_id, status, facts, facts_version, updated_at")
    .eq("draft_id", draftId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the report: ${error.message}`);
  if (!data) return null;
  const facts = data.facts === null ? null : readFacts(data.facts, data.facts_version);
  return {
    draftId: data.draft_id,
    matchId: data.match_id,
    status: STATUSES.includes(data.status as ReportStatus) ? (data.status as ReportStatus) : "failed",
    facts,
    isUnreadable: data.facts !== null && facts === null,
    updatedAt: data.updated_at,
  };
}
