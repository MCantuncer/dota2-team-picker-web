import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";

/** Steam makes the account on the first sign-in, so old sign up links open Sign In. */
export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  redirect(`/login?${new URLSearchParams({ next: safeNext(typeof next === "string" ? next : undefined) })}`);
}
