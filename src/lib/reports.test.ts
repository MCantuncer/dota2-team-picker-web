import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import fixture from "../../test/fixtures/report-facts-v1.json";
import type { Database } from "@/lib/supabase/database.types";
import { getReport } from "./reports";

const DRAFT = "2b1c7f4e-0000-4000-8000-000000000001";

/** A Supabase client whose match_reports query answers with `result`, recording the draft it asked for. */
function fakeClient(result: { data: unknown; error: unknown }) {
  const eq = vi.fn();
  const query = { select: () => query, eq: (...args: unknown[]) => (eq(...args), query), maybeSingle: async () => result };
  return { client: { from: () => query } as unknown as SupabaseClient<Database>, eq };
}

const row = (extra: object = {}) => ({
  draft_id: DRAFT,
  match_id: 9072422905,
  status: "ready",
  facts: structuredClone(fixture),
  facts_version: 1,
  updated_at: "2026-11-02T10:00:00Z",
  ...extra,
});

describe("getReport", () => {
  it("returns a built report with its facts", async () => {
    const { client, eq } = fakeClient({ data: row(), error: null });
    const report = await getReport(client, DRAFT);
    expect(eq).toHaveBeenCalledWith("draft_id", DRAFT);
    expect(report).toMatchObject({ draftId: DRAFT, matchId: 9072422905, status: "ready", isUnreadable: false });
    expect(report?.facts?.score).toEqual({ ours: 57, theirs: 32 });
  });

  it("returns a report that is still waiting for its facts", async () => {
    const report = await getReport(fakeClient({ data: row({ status: "waiting_parse", facts: null, facts_version: null }), error: null }).client, DRAFT);
    expect(report).toMatchObject({ status: "waiting_parse", facts: null, isUnreadable: false });
  });

  it("marks facts this site can't read", async () => {
    const report = await getReport(fakeClient({ data: row({ facts_version: 2 }), error: null }).client, DRAFT);
    expect(report).toMatchObject({ facts: null, isUnreadable: true });
  });

  it("returns null for no report or a draft id that isn't one, without asking", async () => {
    expect(await getReport(fakeClient({ data: null, error: null }).client, DRAFT)).toBeNull();
    const { client, eq } = fakeClient({ data: row(), error: null });
    expect(await getReport(client, "../party")).toBeNull();
    expect(eq).not.toHaveBeenCalled();
  });

  it("throws when the query fails", async () => {
    await expect(getReport(fakeClient({ data: null, error: new Error("denied") }).client, DRAFT)).rejects.toThrow("denied");
  });
});
