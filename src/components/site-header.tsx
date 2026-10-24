import Link from "next/link";
import { Suspense } from "react";
import { rankName } from "@/lib/rank";
import { createClient } from "@/lib/supabase/server";
import { canCaptain, type UserType } from "@/lib/user-type";
import { AccountMenu } from "./account-menu";
import { LogoMark } from "./logo";
import { PrimaryNav, type NavItem } from "./primary-nav";

/** The bar at the top of every page: brand, main sections, and the account menu. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-on-accent"
      >
        Skip to content
      </a>
      <div className="page flex h-14 items-stretch gap-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md" aria-label="Team Picker home">
          <LogoMark />
          <span className="font-heading text-lg font-bold uppercase leading-none tracking-wide text-fg">
            Team Picker
            <span className="ml-2 hidden text-xs font-semibold tracking-widest text-accent sm:inline">Dota 2</span>
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, steam_id, rank_tier, user_type")
    .eq("id", user.id)
    .single();

  const nav: NavItem[] = [{ href: "/my-heroes", label: "My heroes" }];
  if (canCaptain((profile?.user_type as UserType | undefined) ?? "user")) nav.push({ href: "/admin/captain", label: "Captain" });

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
    </>
  );
}
