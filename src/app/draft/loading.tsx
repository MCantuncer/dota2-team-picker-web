import { preload } from "react-dom";
import { SNAPSHOT_URL } from "@/lib/engine/snapshot";

/**
 * Shown while the server reads the player's heroes and party, so the page's header and scripts reach the browser at
 * once instead of after those reads. It also starts the hero data download (5 MB) in the same moment: by the time
 * the board asks for it, the browser has it (live, the board waited 1.3 to 7.9 s for the server before this).
 */
export default function DraftLoading() {
  // Same request as loadSnapshot's fetch (CORS, no cookies), so the browser reuses this download.
  preload(SNAPSHOT_URL, { as: "fetch", crossOrigin: "anonymous" });
  return (
    <main className="page flex flex-1 flex-col gap-5 py-8">
      <p className="text-sm text-muted" role="status">
        Loading your draft…
      </p>
    </main>
  );
}
