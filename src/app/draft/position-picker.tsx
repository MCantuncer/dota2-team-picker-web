import { useRef } from "react";
import { POSITIONS, type Position } from "@/lib/engine/types";
import { POSITION_NAMES } from "@/lib/party";

interface PositionPickerProps {
  heroName: string;
  position: Position;
  /** True when nobody chose the position and it is the likeliest free one for the hero. */
  isGuess: boolean;
  /** Left out when the player can't change the draft. */
  onChange?: (position: Position | null) => void;
}

/**
 * An ally's position as five one-click options. A chosen position is filled; a guessed one is dashed, and a click
 * on it confirms it. Clicking the chosen position again hands it back to the guess. One Tab stop per row: the arrow
 * keys move the choice, 1 to 5 jump to a position, and Delete hands it back to the guess.
 */
export function PositionPicker({ heroName, position, isGuess, onChange }: PositionPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const describe = (p: Position) => {
    const name = `Pos ${p}, ${POSITION_NAMES[p]}`;
    if (p !== position) return name;
    return isGuess ? `${name}, guessed. Click to confirm` : `${name}, chosen`;
  };
  const choose = (p: Position | null) => {
    onChange?.(p);
    if (p !== null) refs.current[p - 1]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const digit = /^[1-5]$/.test(e.key) ? (Number(e.key) as Position) : null; // The regex allows only 1 to 5.
    if (step) choose((((position - 1 + step + 5) % 5) + 1) as Position); // Wraps around inside 1 to 5.
    else if (digit) choose(digit);
    else if ((e.key === "Delete" || e.key === "Backspace") && !isGuess) choose(null);
    else return;
    e.preventDefault();
  };

  return (
    <div className="seg seg-sm" role="radiogroup" aria-label={`${heroName} position`} aria-disabled={!onChange || undefined} onKeyDown={onChange ? onKeyDown : undefined}>
      {POSITIONS.map((p) => (
        <button
          key={p}
          ref={(el) => {
            refs.current[p - 1] = el;
          }}
          type="button"
          role="radio"
          aria-checked={!isGuess && p === position}
          aria-label={describe(p)}
          title={describe(p)}
          tabIndex={p === position ? 0 : -1}
          data-guess={isGuess && p === position ? "" : undefined}
          disabled={!onChange}
          onClick={() => choose(!isGuess && p === position ? null : p)}
          className="seg-item num"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
