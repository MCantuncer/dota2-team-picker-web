import Link from "next/link";
import { cache, Suspense } from "react";
import { rankName } from "@/lib/rank";
import { toParty } from "@/lib/party";
import { signedInUser } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";
import { getHeroes } from "@/lib/heroes";
import { dueCard, poolCardsEnabled, type PoolCard } from "@/lib/pool-cards";
import { type DueCheckIn, gameCheckInEnabled, toDueCheckIn } from "@/lib/game-check-in";
import { AccountMenu } from "./account-menu";
import { ActivityMark } from "./activity-mark";
import { LogoMark } from "./logo";
import { HeaderOpening } from "./nav-pending";
import { NewDraftButton } from "./new-draft-button";
import { CaptainPrompt } from "./captain-prompt";
import { CheckInPrompt } from "./check-in-prompt";
import { HeroPoolCard } from "./hero-pool-card";
import { PartyChip } from "./party-chip";
import { PartyInvitePopup } from "./party-invite-popup";
import { NavBadge, PrimaryNav } from "./primary-nav";
import { SectionDock } from "./section-dock";
import { SectionRow } from "./section-row";
import type { Waiting } from "./sections";

/** The bar at the top of every page (brand, the four sections, the account menu) and the Section Row under it. */
export function SiteHeader() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-on-accent"
        >
          Skip to Content
        </a>
        <div className="page flex h-16 items-stretch gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-md pr-6 sm:border-r sm:border-line" aria-label="Dota2 Team Picker home">
            <LogoMark className="h-8 w-8" />
            <span className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-[-0.02em] text-fg">Team Picker</span>
              <span className="mt-1 text-xs text-muted">for Dota 2</span>
            </span>
          </Link>
          <Suspense fallback={<div className="ml-auto" />}>
            <HeaderSession />
          </Suspense>
        </div>
        <HeaderOpening />
      </header>
      <Suspense fallback={null}>
        <SectionRowSession />
      </Suspense>
    </>
  );
}

/** Who is signed in, read once for the top bar and the Section Row. */
const session = cache(async () => {
  const supabase = await createClient();
  return { supabase, user: await signedInUser(supabase) };
});

/**
 * What waits for the player in Team: friend requests, and Stack invites plus players asking to join their Stacks.
 * Read once for the top bar, the phone's bottom bar and the Section Row. A failure only hides the badge.
 */
const loadWaiting = cache(async (): Promise<Waiting> => {
  const { supabase, user } = await session();
  if (!user) return { friends: 0, stacks: 0 };
  const [{ count: requests }, { data: stackInvites }, { count: joinRequests }] = await Promise.all([
    supabase.from("friendships").select("requester_id", { count: "exact", head: true }).eq("addressee_id", user.id).eq("status", "pending"),
    supabase.rpc("my_team_invites"),
    // Row level security shows only the requests for Stacks this user runs.
    supabase.from("team_join_requests").select("id", { count: "exact", head: true }).eq("status", "pending").neq("user_id", user.id),
  ]);
  return { friends: requests ?? 0, stacks: (stackInvites?.length ?? 0) + (joinRequests ?? 0) };
});

/** The Section Row for a signed-in player. It waits only for the session; each count arrives on its own. */
async function SectionRowSession() {
  const { user } = await session();
  if (!user) return null;
  const badge = (of: keyof Waiting) => (
    <Suspense fallback={null}>
      <WaitingBadge of={of} />
    </Suspense>
  );
  return <SectionRow badges={{ friends: badge("friends"), stacks: badge("stacks") }} />;
}

async function WaitingBadge({ of }: { of: keyof Waiting }) {
  const waiting = await loadWaiting();
  return <NavBadge count={waiting[of]} />;
}

/** Everything in the header that depends on who is signed in. */
async function HeaderSession() {
  const { supabase, user } = await session();

  if (!user) {
    return (
      <div className="ml-auto flex items-center gap-1">
        <Link href="/login" className="btn btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  const [{ data: profile }, { data: partyRows, error: partyError }, waiting] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, steam_id, rank_tier, user_type").eq("id", user.id).single(),
    supabase.rpc("party_view"),
    loadWaiting(),
  ]);
  // The party chip is a shortcut only: without it Draft still shows the party, so a failure just hides it.
  if (partyError) console.error("Header party:", partyError.message);
  const party = partyError ? null : toParty(partyRows);

  const steamLinked = Boolean(profile?.steam_id);
  const poolCard = steamLinked && poolCardsEnabled() ? await loadPoolCard(supabase, user.id) : null;
  // One card at a time: the hero pool card first.
  const checkIn = !poolCard && gameCheckInEnabled() ? await loadCheckIn(supabase) : null;
  const rank = rankName(profile?.rank_tier ?? null);
  const account = {
    name: profile?.display_name || "Player",
    detail: rank ?? "Rank not visible yet",
    avatarUrl: profile?.avatar_url ?? null,
    steamLinked,
    rankTier: profile?.rank_tier ?? null,
  };

  return (
    <>
      <PrimaryNav waiting={waiting} />
      <div className="ml-auto flex items-center gap-3">
        <PartyChip size={party ? party.members.length : null} />
        {/* Draft opens the board as it was; New Draft clears it first. */}
        <NewDraftButton />
        <span aria-hidden className="hidden h-6 w-px bg-line md:block" />
        <AccountMenu account={account} admin={profile?.user_type === "admin"} />
      </div>
      <SectionDock waiting={waiting} />
      <PartyInvitePopup userId={user.id} />
      <CaptainPrompt userId={user.id} />
      {steamLinked && <ActivityMark />}
      {poolCard && <HeroPoolCard key={poolCard.card.id} {...poolCard} />}
      {checkIn && <CheckInPrompt key={checkIn.game.id} {...checkIn} />}
    </>
  );
}

/** The hero pool card to show, with its hero's name and art. Any failure just shows no card. */
async function loadPoolCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ card: PoolCard; heroName: string; heroImage: string | null } | null> {
  const { data, error } = await supabase
    .from("pool_suggestions")
    .select("id, hero_id, position, status, question, reason, snooze_until")
    .eq("user_id", userId)
    .in("status", ["open", "snoozed"])
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) {
    console.error("Header pool card:", error.message);
    return null;
  }
  const card = dueCard(data, Date.now());
  if (!card) return null;
  const hero = await getHeroes()
    .then((heroes) => heroes.find((h) => h.id === card.heroId))
    .catch(() => undefined);
  return { card, heroName: hero?.name ?? "This hero", heroImage: hero?.image ?? null };
}

/** The last game to ask about away from the Draft page, with its hero's name and art. Any failure just shows no card. */
async function loadCheckIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ game: DueCheckIn; heroName: string | null; heroImage: string | null } | null> {
  const { data, error } = await supabase.rpc("due_check_in", { surface: "site" });
  if (error) {
    console.error("Header check-in:", error.message);
    return null;
  }
  const row = data?.[0];
  if (!row) return null;
  const game = toDueCheckIn(row);
  const hero =
    game.myHero === null
      ? undefined
      : await getHeroes()
          .then((heroes) => heroes.find((h) => h.id === game.myHero))
          .catch(() => undefined);
  return { game, heroName: hero?.name ?? null, heroImage: hero?.image ?? null };
}
