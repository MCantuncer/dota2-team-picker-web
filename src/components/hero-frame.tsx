import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { renderOf } from "@/components/hero-render";
import { heroFacePoint, RENDER_SPACE_WIDTH, SQUARE_RENDER, type RenderPoint } from "@/lib/hero-faces";

/*
 * The Lane Board's hero frames. Every hero frame is the Lane Cut (`.lane-cut` in globals.css): the logo frame with the
 * two mid lane corners, top right and bottom left, cut at 45 degrees. Small faces are square crops of the 16:9
 * portrait; large frames hold the full-body render on our stage, placed by the hero's face point.
 */

/** Smallest and largest HeroFace, in px. Bigger heroes use HeroStage with HeroArt. */
export const HERO_FACE_MIN_PX = 20;
export const HERO_FACE_MAX_PX = 64;

/** Widest render on screen, in CSS px: the Steam render has twice the pixels, so it stays sharp on a 2x screen. */
export const HERO_ART_MAX_WIDTH_PX = RENDER_SPACE_WIDTH;

/** Where to put the face when a hero has no measured point yet: the middle, about where most faces sit. */
const DEFAULT_FACE: RenderPoint = [RENDER_SPACE_WIDTH / 2, 180];

/** Crops the 16:9 portrait to a square a little above its middle, where the face is. */
const FACE_CROP: CSSProperties = { objectPosition: "50% 35%" };

/** The Lane Cut's cut and corner radius for a frame whose short side is `size` px: both grow with the frame. */
export function laneCutOf(size: number): { cut: number; radius: number } {
  const cut = size <= 20 ? 4 : size <= 28 ? 5 : size <= 40 ? 7 : size <= 64 ? 9 : size <= 100 ? 13 : 16;
  const radius = size <= 28 ? 4 : size <= 64 ? 6 : 8;
  return { cut, radius };
}

/** The `.lane-cut` variables for a frame whose short side is `size` px. */
export function laneCutStyle(size: number): CSSProperties {
  const { cut, radius } = laneCutOf(size);
  // CSS custom properties are not in CSSProperties; the cast only adds them.
  return { "--cut": `${cut}px`, "--cut-radius": `${radius}px` } as CSSProperties;
}

interface HeroFaceProps {
  /** The hero's 256x144 Steam portrait. */
  portrait: string;
  /** The hero's name, as its alt text and tooltip. */
  name: string;
  /** Side in px, 20 to 64. */
  size?: number;
  /** An enemy hero: the frame's edge is Dire red. */
  isEnemy?: boolean;
  /** Greyed and faded, for a hero that is banned or out of play. */
  isDim?: boolean;
  /** The name is written next to the face, so screen readers skip the image. The tooltip stays. */
  isDecorative?: boolean;
}

/** A hero's face as a Lane Cut square, cropped from the portrait. For rails, reason lines and chips. */
export function HeroFace({
  portrait,
  name,
  size = 20,
  isEnemy = false,
  isDim = false,
  isDecorative = false,
}: HeroFaceProps) {
  const side = Math.min(HERO_FACE_MAX_PX, Math.max(HERO_FACE_MIN_PX, Math.round(size)));
  return (
    <span
      title={name}
      className={`lane-cut flex shrink-0 ${isEnemy ? "lane-cut-enemy" : ""}`}
      style={{ width: side, height: side, ...laneCutStyle(side) }}
    >
      <Image
        src={portrait}
        alt={isDecorative ? "" : name}
        width={Math.round((side * 16) / 9)}
        height={side}
        className={`size-full object-cover ${isDim ? "opacity-60 grayscale" : ""}`}
        style={FACE_CROP}
      />
    </span>
  );
}

/**
 * How one kind of frame shows its render, shared by every hero in that frame kind so all faces line up: the render's
 * width in CSS px, and where its face point lands, as fractions of the frame's width and height.
 */
export interface HeroArtPlacement {
  width: number;
  at: RenderPoint;
}

interface HeroArtProps {
  heroId: number;
  /** The hero's Steam portrait; the render's URL is derived from it. */
  portrait: string;
  placement: HeroArtPlacement;
  /** Flips the render to face left, for the enemy side of a versus; the face point flips with it. */
  mirror?: boolean;
}

/**
 * The hero's full-body render, placed so its face point lands at `placement.at` of the frame. Decorative: the card
 * writes the hero's name. Put it in a HeroStage (or any `relative` box that clips).
 */
export function HeroArt({ heroId, portrait, placement, mirror = false }: HeroArtProps) {
  const src = renderOf(portrait);
  if (!src) return null;
  const measured = heroFacePoint(heroId);
  const [faceX, faceY] = measured?.face ?? DEFAULT_FACE;
  const [renderWidth, renderHeight] = measured?.size ?? SQUARE_RENDER;
  const width = Math.min(HERO_ART_MAX_WIDTH_PX, Math.round(placement.width));
  const scale = width / RENDER_SPACE_WIDTH;
  const [atX, atY] = placement.at;
  // Mirrored, the face sits as far from the right edge as it did from the left.
  const fromLeft = mirror ? width - Math.round(faceX * scale) : Math.round(faceX * scale);
  return (
    <Image
      src={src}
      alt=""
      draggable={false}
      width={width}
      height={Math.round(renderHeight * (width / renderWidth))}
      className="pointer-events-none absolute max-w-none select-none"
      style={{
        width,
        height: "auto",
        left: `calc(${atX * 100}% - ${fromLeft}px)`,
        top: `calc(${atY * 100}% - ${Math.round(faceY * scale)}px)`,
        ...(mirror ? { transform: "scaleX(-1)" } : {}),
      }}
    />
  );
}

interface HeroStageProps {
  /** The frame's short side in px, which sets the size of the cut corners. */
  size: number;
  /** Sizes the frame, such as `h-30 w-52`. */
  className?: string;
  isEnemy?: boolean;
  /** The HeroArt, and any overlay drawn over it. */
  children: ReactNode;
}

/** A Lane Cut frame with our stage light behind the render. Every large hero card uses it. */
export function HeroStage({ size, className = "", isEnemy = false, children }: HeroStageProps) {
  return (
    <span className={`lane-cut hero-stage ${isEnemy ? "lane-cut-enemy" : ""} ${className}`} style={laneCutStyle(size)}>
      {children}
    </span>
  );
}

interface CutOutlineProps {
  /** The box's size in px; the outline scales to fill a box of this shape. */
  width: number;
  height: number;
}

/**
 * The outline of an empty slot: a Lane Cut with solid corners and dashed straight edges, drawn in an SVG so the dashes
 * follow the cut. It fills its `relative` parent, which should have the same shape.
 */
export function CutOutline({ width: w, height: h }: CutOutlineProps) {
  const { cut: c, radius: r } = laneCutOf(Math.min(w, h));
  const i = 0.5; // half the stroke, so the line sits inside the box
  const e = 4; // each corner stroke runs this far into its edges, so the corners always read as drawn
  const corners = [
    `M${i} ${r + e}V${r}Q${i} ${i} ${r} ${i}H${r + e}`,
    `M${w - c - e} ${i}H${w - c}L${w - i} ${c}V${c + e}`,
    `M${w - i} ${h - r - e}V${h - r}Q${w - i} ${h - i} ${w - r} ${h - i}H${w - r - e}`,
    `M${c + e} ${h - i}H${c}L${i} ${h - c}V${h - c - e}`,
  ].join("");
  const edges = `M${r + e} ${i}H${w - c - e}M${w - i} ${c + e}V${h - r - e}M${w - r - e} ${h - i}H${c + e}M${i} ${h - c - e}V${r + e}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 size-full text-line-control" aria-hidden>
      <path d={corners} fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" />
      <path d={edges} fill="none" stroke="currentColor" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The section mark: the logo frame and its lane, 16px, in the text colour (set it with a `text-*` class). */
export function LaneMark({ className = "text-subtle" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-4 shrink-0 ${className}`} aria-hidden>
      <path
        d="M2 1.5h9L14.5 5v9.5H5L1.5 11V2a.5.5 0 0 1 .5-.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path d="M5 11 11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
