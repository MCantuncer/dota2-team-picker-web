import { redirect } from "next/navigation";

/** The party lives on Draft's Team Seats now; old links and bookmarks land there. */
export default function PartyPage() {
  redirect("/draft");
}
