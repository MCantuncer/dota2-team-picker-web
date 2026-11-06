import Image from "next/image";
import type { DueCheckIn } from "@/lib/game-check-in";

/**
 * On a new, empty board: one quiet line about the last game still waiting for its check-in, with
 * Answer Now. It sits in the page head, so it never pushes the board, and goes with the first hero.
 */
export function LastGameLine({
  game,
  heroOf,
  portraits,
  onAnswer,
}: {
  game: DueCheckIn;
  heroOf: (id: number) => { name: string };
  portraits: Record<number, string>;
  onAnswer: () => void;
}) {
  const art = game.myHero !== null ? portraits[game.myHero] : undefined;
  const name = game.myHero !== null ? heroOf(game.myHero).name : null;
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-line bg-surface p-1 text-sm text-muted">
      {art ? (
        <Image src={art} alt="" width={56} height={32} className="h-8 w-14 rounded-xs object-cover" />
      ) : (
        <span aria-hidden className="w-1.5" />
      )}
      <p className="min-w-0 flex-1">{name ? `Last game with ${name}: how did it go?` : "Your last game: how did it go?"}</p>
      <button onClick={onAnswer} className="btn btn-secondary btn-sm">
        Answer Now
      </button>
    </div>
  );
}
