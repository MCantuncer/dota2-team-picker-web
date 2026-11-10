import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CHECK_DAYS, readCheck, readSlips, SLIP_ROWS } from "@/lib/admin-pool-check";
import { getHeroes } from "@/lib/heroes";
import { createClient } from "@/lib/supabase/server";
import { CheckStrip, Slips } from "./pool-check";

export const metadata: Metadata = { title: "Pool Check · Dota 2 Team Picker", robots: { index: false } };

/** Admins only: whether party suggestion lists kept to each player's own heroes. */
export default async function PoolCheckPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile, error } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();
  // Fail closed: anyone we can't confirm as an admin sees the normal 404. The database checks again.
  if (error || profile.user_type !== "admin") notFound();

  const [checkResult, slipsResult, heroes] = await Promise.all([
    supabase.rpc("admin_pool_check", { days: CHECK_DAYS }),
    supabase.rpc("admin_pool_slips", { max_rows: SLIP_ROWS }),
    getHeroes(),
  ]);
  if (checkResult.error) console.error("Admin pool check:", checkResult.error.message);
  if (slipsResult.error) console.error("Admin pool slips:", slipsResult.error.message);
  const check = checkResult.error ? null : readCheck(checkResult.data);
  const slips = slipsResult.error ? null : readSlips(slipsResult.data);
  const nowMs = renderedAt();

  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="page-title">Pool Check</h1>
        <p className="text-sm text-muted">
          Party suggestion lists from the last {CHECK_DAYS} days. A slip is a list from a player&apos;s own or played heroes that showed another hero.
        </p>
      </div>

      {!check || !slips ? (
        <p role="alert" className="notice notice-error">
          Couldn&apos;t load the pool check. Please refresh the page.
        </p>
      ) : (
        <>
          <CheckStrip check={check} />
          <section aria-labelledby="slips" className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="slips" className="section-title">
                Latest Slips
              </h2>
              <span className="text-sm text-muted">Newest first, Turkey time</span>
            </div>
            <Slips slips={slips} heroes={heroes.map((h) => ({ id: h.id, name: h.name, icon: h.icon }))} nowMs={nowMs} />
          </section>
        </>
      )}
    </main>
  );
}

/** A server component renders once per request, so reading the clock here is stable for that render. */
function renderedAt(): number {
  return Date.now();
}
