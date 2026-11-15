"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";

const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";

/** The Invoker render behind it all: graded down and faded at the edges so the copy stays in front. */
const RENDER_STYLE: CSSProperties = {
  filter: "grayscale(.55) sepia(.25) brightness(.55)",
  maskImage: "radial-gradient(closest-side at 50% 45%, #000 50%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(closest-side at 50% 45%, #000 50%, transparent 100%)",
};

/** How much of the scene must be on screen before he starts thinking. */
const SEEN = 0.6;

type Orb = "wex" | "exort";

/** One side of the choice: in how many of the games the player put this level's point in it. */
interface Option {
  orb: Orb;
  name: string;
  took: number;
}

/** The skill choice the homepage Invoker makes. Frozen from a real lookup, like the example picks card. */
export interface SkillChoice {
  level: number;
  /** Games looked at; the rest of them put the point somewhere else (Quas). */
  games: number;
  /** Whose games they are, for the reason line, such as "winning high-rank mid Invokers". */
  players: string;
  /** The enemies the games were played against, as one phrase. */
  against: string;
  wex: Option;
  exort: Option;
}

/**
 * Invoker weighing Wex against Exort for his next skill point, then taking the one winning players took: a
 * hint that the site plans skills and items as well as picks. Sits right above the example picks card at every
 * width: beside the copy on wide screens, under it on tablets and phones (scaled down a step on the narrowest
 * phones so nothing is cut off).
 *
 * Plays once with CSS (see "Next skill showcase" in globals.css). The base styles are the decided state, so
 * with reduced motion, or before the animation runs, it simply shows the choice. If the scene starts below the
 * fold (phones), it holds still until it is mostly on screen, then plays from the start.
 */
export function NextSkillShowcase({ choice }: { choice: SkillChoice }) {
  const stage = useRef<HTMLDivElement>(null);
  const picked = choice.exort.took >= choice.wex.took ? choice.exort : choice.wex;
  const passed = picked === choice.exort ? choice.wex : choice.exort;
  const role = (o: Option) => (o === picked ? "ns-picked" : "ns-passed");
  const pct = (o: Option) => `${Math.round((o.took / choice.games) * 100)}%`;

  useEffect(() => {
    const el = stage.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < SEEN) {
          el.dataset.wait = "";
          return;
        }
        if (el.dataset.wait !== undefined) {
          for (const a of el.getAnimations({ subtree: true })) a.currentTime = 0;
          delete el.dataset.wait;
        }
        io.disconnect();
      },
      { threshold: SEEN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={stage} className="ns-stage">
      <div className="next-skill">
        <Image
          src="/art/invoker.webp"
          alt=""
          aria-hidden
          width={1100}
          height={1100}
          priority
          style={RENDER_STYLE}
          className="ns-render"
        />
        {/* Exort sits above the raised right hand, Wex at the left hand. */}
        {[choice.wex, choice.exort].map((o) => (
          <span key={o.orb} aria-hidden className={`ns-orb ns-orb-${o.orb} ${role(o)}`}>
            <Image src={`${ABILITY_CDN}invoker_${o.orb}.png`} alt="" width={48} height={48} />
          </span>
        ))}
        {picked.orb === "exort" && <span aria-hidden className="ns-leader" />}

        <section aria-label="Example skill choice" className="ns-panel">
          <p className="flex justify-between px-1 text-xs text-subtle">
            <span>Next Skill at Level {choice.level}</span>
            <span className="ns-swap">
              <span aria-hidden className="ns-before">
                Weighing
              </span>
              <span className="ns-after">{picked.name}</span>
            </span>
          </p>
          <ul>
            {[passed, picked].map((o) => (
              <li key={o.orb} className={`ns-row ${role(o)}`}>
                <Image
                  src={`${ABILITY_CDN}invoker_${o.orb}.png`}
                  alt=""
                  width={22}
                  height={22}
                  className="size-5.5 rounded-md"
                />
                <span>{o.name}</span>
                <span className="num text-[0.8125rem]">{pct(o)}</span>
              </li>
            ))}
          </ul>
          <p className="ns-swap mt-2 px-1 text-xs leading-4 text-subtle">
            <span aria-hidden className="ns-before">
              What {choice.players} took next against {choice.against}
            </span>
            <span className="ns-after">
              <span className="font-medium text-fg">{picked.name} next</span>: {picked.took} of {choice.games}{" "}
              {choice.players} against {choice.against} took it.
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
