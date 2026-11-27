import type { ReactNode } from "react";
import { HeroRender } from "./hero-render";

interface PageStageProps {
  /** The page's name: one small line above the title, with `facts` beside it. */
  name: string;
  /** Short facts on the name's line, such as the patch and how many games the numbers come from. */
  facts?: ReactNode;
  /** The page's finding, written from its data. It is the page's heading. */
  title: string;
  /** The portrait of the hero the title names. Its render stands on the right, dimmed. */
  portrait?: string;
  /** A page whose finding names no hero puts its own figure in the hero's place. */
  figure?: ReactNode;
  /** The page's one main button, under the line. */
  actions?: ReactNode;
  /** One or two sentences of numbers behind the title. */
  children?: ReactNode;
}

/**
 * How a page opens (the Stage): its name as a small line, its finding as the title, one line of numbers, and the
 * hero the title names on the right. From `lg` the hero stands beside the text; below that there is no room, so it
 * fades behind the text. A page's own `figure` takes the hero's place from `md` and, being data, moves under the text below that.
 */
export function PageStage({ name, facts, title, portrait, figure, actions, children }: PageStageProps) {
  return (
    <section
      className={
        figure
          ? "grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_20rem]"
          : "relative isolate lg:min-h-44 lg:pr-80"
      }
    >
      {/* Below lg the hero is a backdrop: it reaches the screen's edge and fades out at the section's foot, so it never
          runs behind what follows. */}
      {!figure && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-11 -right-4 bottom-0 left-0 -z-10 overflow-hidden max-lg:mask-b-from-60% sm:-right-6 lg:overflow-visible"
        >
          <HeroRender portrait={portrait} className="absolute top-0 -right-20 w-85 opacity-25 lg:-top-3 lg:right-8 lg:w-76 lg:opacity-100" />
        </div>
      )}
      <div className="grid content-start gap-3">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
          <span aria-hidden className="font-semibold text-fg">
            {name}
          </span>
          {facts}
        </p>
        <h1 className="text-xl font-semibold tracking-[-0.03em] text-balance text-fg sm:text-2xl sm:leading-11">
          <span className="sr-only">{/[?!.]$/.test(name) ? name : `${name}:`}</span> {title}
        </h1>
        {children && <p className="max-w-2xl text-base text-muted">{children}</p>}
        {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {figure}
    </section>
  );
}
