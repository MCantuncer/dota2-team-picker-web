import Link from "next/link";
import { getUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getUser();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Pick the right hero, fast.</h1>
      <p className="text-lg text-zinc-400">
        Tell us your position and the heroes already picked, and get 8 suggestions with reasons in seconds,
        weighed by counters, synergy, the current meta at your rank, and the heroes you play best.
      </p>
      {user ? (
        <div className="flex flex-col gap-3">
          <p className="text-zinc-300">You&apos;re signed in. The draft screen is coming next.</p>
          <Link href="/profile" className="self-start rounded-md bg-red-700 px-4 py-2 font-semibold hover:bg-red-600">
            Pick your favorite heroes
          </Link>
        </div>
      ) : (
        <div className="flex gap-3">
          <Link href="/login" className="rounded-md bg-red-700 px-4 py-2 font-semibold hover:bg-red-600">
            Log in
          </Link>
          <Link href="/signup" className="rounded-md px-4 py-2 font-semibold ring-1 ring-zinc-600 hover:bg-zinc-800">
            Sign up
          </Link>
        </div>
      )}
    </main>
  );
}
