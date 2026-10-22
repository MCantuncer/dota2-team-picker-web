import Image from "next/image";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

/** Header corner: the signed-in user's name and a sign out button, or a log in link. */
export async function UserMenu() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link href="/login" className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold hover:bg-red-600">
        Log in
      </Link>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex items-center gap-3 text-sm">
      {profile?.avatar_url && (
        <Image src={profile.avatar_url} alt="" width={28} height={28} className="rounded-full" />
      )}
      <Link href="/my-heroes" className="text-zinc-400 hover:text-zinc-100">
        My heroes
      </Link>
      {isAdmin(user.id) && (
        <Link href="/admin/captain" className="text-zinc-400 hover:text-zinc-100">
          Captain
        </Link>
      )}
      <span className="max-w-40 truncate text-zinc-200">{profile?.display_name ?? user.email}</span>
      <form action="/auth/signout" method="post">
        <button type="submit" className="text-zinc-400 hover:text-zinc-100">
          Sign out
        </button>
      </form>
    </div>
  );
}
