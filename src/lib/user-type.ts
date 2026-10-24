import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";

/** Account type from profiles.user_type. It is set by hand in the database; users cannot change it. */
export type UserType = "user" | "captain" | "admin";

/** The account type of a signed-in user, read once per request. */
export const getUserType = cache(async (userId: string): Promise<UserType> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("user_type").eq("id", userId).maybeSingle();
  return (data?.user_type as UserType | undefined) ?? "user";
});

/** Captains and admins can run Captain mode. */
export function canCaptain(type: UserType): boolean {
  return type === "captain" || type === "admin";
}
