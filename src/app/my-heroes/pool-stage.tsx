"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { PageStage } from "@/components/page-stage";
import type { Hero } from "@/lib/heroes";
import { poolVerdict } from "@/lib/pool-verdict";

type Picks = Record<number, number[]>;

const PoolContext = createContext<{ picks: Picks; setPicks: (picks: Picks) => void } | null>(null);

/** Holds the hero lists as the player edits them, so the page's opening can follow the lists under it. */
export function PoolProvider({ initial, children }: { initial: Picks; children: ReactNode }) {
  const [picks, setPicks] = useState(initial);
  const value = useMemo(() => ({ picks, setPicks }), [picks]);
  return <PoolContext value={value}>{children}</PoolContext>;
}

/** Tells the page's opening the lists as they are now. Call it from the component that edits them. */
export function useReportPool(picks: Picks) {
  const setPicks = useContext(PoolContext)?.setPicks;
  useEffect(() => {
    setPicks?.(picks);
  }, [setPicks, picks]);
}

/**
 * How My Heroes opens (the Stage): the pool hero the player played most as the title, the next two and the roles
 * with no heroes under it. Worked out from the lists as they are on screen, so it changes with every add or remove.
 */
export function PoolStage({ heroes, stats, aside }: { heroes: Hero[]; stats: unknown; aside?: ReactNode }) {
  const picks = useContext(PoolContext)?.picks;
  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const verdict = poolVerdict(picks ?? {}, stats, (id) => byId.get(id)?.name);
  return (
    <PageStage
      name="My Heroes"
      facts={verdict.facts && <span>{verdict.facts}</span>}
      title={verdict.title}
      portrait={verdict.heroId === null ? undefined : byId.get(verdict.heroId)?.image}
      aside={aside}
    >
      {verdict.line}
    </PageStage>
  );
}
