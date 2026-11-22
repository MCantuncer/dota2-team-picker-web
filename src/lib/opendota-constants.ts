import "server-only";

/** How long a page waits for OpenDota before it uses the copy shipped with the site. */
export const OPENDOTA_TIMEOUT_MS = 5000;

/**
 * One of OpenDota's constants lists, keyed as OpenDota keys it, cached for a day. When OpenDota is down, slow or
 * answers an error, the trimmed copy in src/lib/data is used instead (scripts/update-opendota-copy.mjs refreshes
 * it), so neither a page nor a build ever hangs on OpenDota. With OPENDOTA_CONSTANTS=bundled only the copy is
 * used: the browser tests set it so they never depend on OpenDota being up.
 */
export async function getOpenDotaConstants(name: "heroes" | "items"): Promise<Record<string, unknown>> {
  if (process.env.OPENDOTA_CONSTANTS !== "bundled") {
    try {
      const res = await fetch(`https://api.opendota.com/api/constants/${name}`, {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(OPENDOTA_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body: unknown = await res.json();
      if (isRecord(body) && Object.keys(body).length > 0) return body;
      throw new Error("unexpected shape");
    } catch (err) {
      console.error(`OpenDota ${name} list failed, using the copy shipped with the site:`, err);
    }
  }
  const copy = name === "heroes" ? await import("./data/opendota-heroes.json") : await import("./data/opendota-items.json");
  return copy.default;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
