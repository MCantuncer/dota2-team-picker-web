import Link from "next/link";
import { Suspense } from "react";
import { rankName } from "@/lib/rank";
import { toParty } from "@/lib/party";
import { createClient } from "@/lib/supabase/server";
import { getHeroes } from "@/lib/heroes";
import { dueCard, poolCardsEnabled, type PoolCard } from "@/lib/pool-cards";
import { canOpenCaptainMode } from "@/lib/user-type";
import { AccountMenu } from "./account-menu";
import { ActivityMark } from "./activity-mark";
import { Icon } from "./icon";
import { LogoMark } from "./logo";
import { CaptainPrompt } from "./captain-prompt";
import { HeroPoolCard } from "./hero-pool-card";
import { PartyInvitePopup } from "./party-invite-popup";
import { PrimaryNav, type NavItem } from "./primary-nav";

/** The bar at the top of every page: brand, main sections, and the account menu. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-on-accent"
      >
        Skip to Content
      </a>
      <div className="page flex h-16 items-stretch gap-6">
        <Link href="/" className="flex items-center gap-3 rounded-md pr-6 sm:border-r sm:border-line" aria-label="Dota2 Team Picker home">
          <LogoMark className="h-8 w-8" />
          <span className="flex flex-col leading-none">
            <span className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-fg">Team Picker</span>
            <span className="mt-1 text-xs text-subtle">for Dota 2</span>
          </span>
        </Link>
        <Suspense fallback={<div className="ml-auto" />}>
          <HeaderSession />
        </Suspense>
      </div>
    </header>
  );
}

/** Everything in the header that depends on who is signed in. */
async function HeaderSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="ml-auto flex items-center gap-1">
        <Link href="/login" className="btn btn-ghost">
          Log In
        </Link>
        <Link href="/signup" className="btn btn-primary">
          Sign Up
        </Link>
      </div>
    );
  }

  const [{ data: profile }, { count: requests }, { data: partyRows, error: partyError }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, steam_id, rank_tier").eq("id", user.id).single(),
    // Friend requests waiting for this user.
    supabase
      .from("friendships")
      .select("requester_id", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
    supabase.rpc("party_view"),
  ]);
  // The party chip is a shortcut only: without it the Party page still works, so a failure just hides it.
  if (partyError) console.error("Header party:", partyError.message);
  const party = partyError ? null : toParty(partyRows);

  const nav: NavItem[] = [
    { href: "/draft", label: "Draft", icon: "swords" },
    { href: "/my-heroes", label: "My Heroes", icon: "helmet" },
    { href: "/party", label: "Party", icon: "users" },
    { href: "/friends", label: "Friends", icon: "userPlus", badge: requests ?? 0 },
  ];
  if (await canOpenCaptainMode(user.id)) nav.push({ href: "/admin/captain", label: "Captain", icon: "crown" });

  const steamLinked = Boolean(profile?.steam_id);
  const poolCard = steamLinked && poolCardsEnabled() ? await loadPoolCard(supabase, user.id) : null;
  const rank = rankName(profile?.rank_tier ?? null);
  const account = {
    name: profile?.display_name || user.email?.split("@")[0] || "Player",
    detail: steamLinked ? (rank ?? "Rank not visible yet") : (user.email ?? null),
    avatarUrl: profile?.avatar_url ?? null,
    steamLinked,
    rankTier: profile?.rank_tier ?? null,
  };

  return (
    <>
      <PrimaryNav items={nav} />
      <div className="ml-auto flex items-center gap-3">
        {party && (
          <Link
            href="/party"
            className="hidden items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted ring-1 ring-inset ring-line-strong hover:text-fg md:flex"
          >
            <span aria-hidden className="live-dot text-radiant" />
            In a party <span className="num text-fg">{party.members.length}/5</span>
          </Link>
        )}
        <Link href="/draft" className="btn btn-primary btn-sm hidden md:inline-flex">
          <Icon name="plus" />
          New Draft
        </Link>
        <span aria-hidden className="hidden h-6 w-px bg-line md:block" />
        <AccountMenu account={account} nav={nav} />
      </div>
      <PartyInvitePopup userId={user.id} />
      <CaptainPrompt userId={user.id} />
      {steamLinked && <ActivityMark />}
      {poolCard && <HeroPoolCard key={poolCard.card.id} {...poolCard} />}
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
