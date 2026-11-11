import { AuthCard } from "@/components/auth-card";
import { createClient } from "@/lib/supabase/server";
import { FollowForm } from "./follow-form";

export const metadata = { title: "Follow Your PC · Dota 2 Team Picker" };

/**
 * Where the PC's QR code leads. The code rides in the address's #fragment, which never reaches our server, its
 * logs or link previews; the form below posts it with one tap, so nothing can use it up but the player.
 */
export default async function FollowPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let name: string | null = null;
  if (data.user) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle();
    name = profile?.display_name ?? "your account";
  }
  return (
    <AuthCard title="Follow Your PC" formFirst>
      <FollowForm signedInAs={name} />
    </AuthCard>
  );
}
