import Link from "next/link";
import { AuthCard, Divider } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { SteamButton } from "@/components/steam-button";
import { safeNext } from "@/lib/safe-next";
import { signUp } from "../login/actions";

export const metadata = { title: "Sign up · Dota 2 Team Picker" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  const nextPath = safeNext(typeof next === "string" ? next : undefined);

  return (
    <AuthCard title="Sign up">
      <SteamButton next={nextPath} />
      <p className="text-center text-xs text-zinc-500">
        Signing in with Steam needs no sign up and adds your rank to suggestions.
      </p>
      <Divider />
      <AuthForm action={signUp} submitLabel="Sign up with email" next={nextPath} askName />
      <p className="text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-red-400 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
