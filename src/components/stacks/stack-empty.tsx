import Image from "next/image";
import type { ReactNode } from "react";
import { renderOf } from "@/components/hero-render";
import { Icon, type IconName } from "@/components/icon";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "./stack-lineup";

const STEPS: { icon: IconName; title: string }[] = [
  { icon: "layers", title: "Name Your Stack" },
  { icon: "userPlus", title: "Invite Your Players" },
  { icon: "play", title: "Draft Together" },
];

/**
 * The Stacks page before you have a Stack: a banner with one hero render and the create form, three steps,
 * and the five empty seats the Stack will fill. `hero` is the portrait of your top hero, or a stand-in.
 */
export function StackEmpty({ hero, create }: { hero?: string; create: ReactNode }) {
  const render = renderOf(hero);
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="no-stack" className="stack-banner flex min-h-72 flex-col gap-4 p-6 sm:p-9">
        {render && (
          <Image
            src={render}
            alt=""
            aria-hidden
            width={560}
            height={560}
            className="stack-render -right-24 -top-6 w-88 opacity-40 sm:right-6 sm:-top-8 sm:w-112 sm:opacity-100"
          />
        )}
        <span className="chip chip-accent self-start">
          <Icon name="layers" />
          New Stack
        </span>
        <h2 id="no-stack" className="page-title sm:text-5xl">
          Build Your Stack
        </h2>
        <p className="max-w-md text-muted">The players you queue with, saved once. Draft for all five together.</p>
        <div className="mt-auto pt-2">{create}</div>
      </section>

      <ol aria-label="How it works" className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3.5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-center gap-3 rounded-md bg-surface p-4 ring-1 ring-inset ring-line">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-raised text-accent ring-1 ring-inset ring-line-strong">
              <Icon name={s.icon} large />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="micro text-subtle">Step {i + 1}</span>
              <span className="font-semibold text-fg">{s.title}</span>
            </span>
          </li>
        ))}
      </ol>

      <section aria-labelledby="open-seats-heading" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="open-seats-heading" className="section-title">
            Your Lineup
          </h2>
          <p className="text-sm text-subtle">Five seats, one per position.</p>
        </div>
        <ul className="grid grid-cols-5 gap-2 sm:gap-3.5">
          {[1, 2, 3, 4, 5].map((p) => (
            <li
              key={p}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-line-strong p-2 sm:aspect-[4/3] sm:gap-2"
            >
              <PositionIcon position={p} size={32} className="text-subtle" />
              <span className="flex flex-col items-center leading-tight">
                <span className="text-center text-sm font-semibold text-muted sm:text-base">{POSITION_NAMES[p]}</span>
              </span>
              <span className="micro text-subtle max-sm:hidden">Open Seat</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
