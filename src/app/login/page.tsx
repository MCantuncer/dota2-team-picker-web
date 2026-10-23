import Link from "next/link";
import { AuthCard, Divider } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { SteamButton } from "@/components/steam-button";
import { safeNext } from "@/lib/safe-next";
import { logIn } from "./actions";

export const metadata = { title: "Log in · Dota 2 Team Picker" };

const ERRORS: Record<string, string> = {
  steam: "Steam sign-in did not work. Please try again.",
  link: "That sign-in link is invalid or has expired.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = safeNext(typeof next === "string" ? next : undefined);
  const errorText = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <AuthCard title="Log in">
      {errorText && <p className="rounded-md bg-dire/10 p-3 text-sm text-dire">{errorText}</p>}
      <SteamButton next={nextPath} />
      <p className="text-center text-xs text-subtle">
        Steam accounts get rank-based suggestions. Turn on <em>Expose Public Match Data</em> in Dota 2 so we can
        read it.
      </p>
      <Divider />
      <AuthForm action={logIn} submitLabel="Log in with email" next={nextPath} />
      <p className="text-center text-sm text-muted">
        No account?{" "}
        <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="link">
          Sign up with email
        </Link>
      </p>
    </AuthCard>
  );
}
