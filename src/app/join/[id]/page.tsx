import { redirect } from "next/navigation";

/** Email invites are gone: an old invite link opens Stacks, where friends invite each other. */
export default function JoinPage() {
  redirect("/stacks");
}
