import { AuthCard } from "@/components/auth-card";
import { SteamButton } from "@/components/steam-button";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Sign in · Dota 2 Team Picker" };

const ERRORS: Record<string, string> = {
  steam: "Steam sign-in did not work. Please try again.",
  link: "That sign-in link is invalid or has expired.",
};

/** Steam is the only way in. The first sign-in makes the account, so there is no separate sign up. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = safeNext(typeof next === "string" ? next : undefined);
  const errorText = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <AuthCard title="Sign In">
      {errorText && <p className="rounded-md bg-dire/10 p-3 text-sm text-dire">{errorText}</p>}
      <SteamButton next={nextPath} primary />
      <p className="text-sm text-muted">
        You sign in on steamcommunity.com. We only get your public SteamID, never your password or email.
      </p>
      <p className="text-sm text-subtle">
        For rank-based suggestions, turn on <em>Expose Public Match Data</em> in Dota 2 (Settings &gt; Options &gt;
        Social).
      </p>
    </AuthCard>
  );
}
