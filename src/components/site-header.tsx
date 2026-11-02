import Link from "next/link";
import { Suspense } from "react";
import { rankName } from "@/lib/rank";
import { createClient } from "@/lib/supabase/server";
import { canOpenCaptainMode } from "@/lib/user-type";
import { AccountMenu } from "./account-menu";
import { LogoMark } from "./logo";
import { CaptainPrompt } from "./captain-prompt";
import { PartyInvitePopup } from "./party-invite-popup";
import { PrimaryNav, type NavItem } from "./primary-nav";

/** The bar at the top of every page: brand, main sections, and the account menu. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-on-accent"
      >
        Skip to content
      </a>
      <div className="page flex h-16 items-stretch gap-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md" aria-label="Dota2 Team Picker home">
          <LogoMark className="h-6 w-6" />
          <span className="text-lg font-semibold leading-none tracking-[-0.02em] text-fg">
            <span className="hidden sm:inline">Dota2 </span>Team Picker
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
          Log in
        </Link>
        <Link href="/signup" className="btn btn-primary">
          Sign up
        </Link>
      </div>
    );
  }

  const [{ data: profile }, { count: requests }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, steam_id, rank_tier").eq("id", user.id).single(),
    // Friend requests waiting for this user.
    supabase
      .from("friendships")
      .select("requester_id", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
  ]);

  const nav: NavItem[] = [
    { href: "/draft", label: "Draft" },
    { href: "/my-heroes", label: "My heroes" },
    { href: "/party", label: "Party" },
    { href: "/friends", label: "Friends", badge: requests ?? 0 },
  ];
  if (await canOpenCaptainMode(user.id)) nav.push({ href: "/admin/captain", label: "Captain" });

  const steamLinked = Boolean(profile?.steam_id);
  const rank = rankName(profile?.rank_tier ?? null);
  const account = {
    name: profile?.display_name || user.email?.split("@")[0] || "Player",
    detail: steamLinked ? (rank ?? "Rank not visible yet") : (user.email ?? null),
    avatarUrl: profile?.avatar_url ?? null,
    steamLinked,
  };

  return (
    <>
      <PrimaryNav items={nav} />
      <div className="ml-auto flex items-center">
        <AccountMenu account={account} nav={nav} />
      </div>
      <PartyInvitePopup userId={user.id} />
      <CaptainPrompt userId={user.id} />
    </>
  );
}
