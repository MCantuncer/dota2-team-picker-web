interface VerdictHeadProps {
  /** What the panel is: "Winners and Losers". */
  label: string;
  /** What the numbers cover, in a few words: the measure, the role, the dates. */
  facts?: string;
  /** The panel's finding, written from its data. Without one the label is the title. */
  finding?: string | null;
  /** One more sentence under the title, only where the panel needs it. */
  note?: string;
  /** A panel inside a section: its title is an `h3`. */
  small?: boolean;
}

/**
 * A panel's head (the Verdict Title): the label as a small line with its facts, then the finding as the title. A
 * panel with no finding, such as a tool, shows its label as the title and the facts under it.
 */
export function VerdictHead({ label, facts, finding, note, small }: VerdictHeadProps) {
  const Heading = small ? "h3" : "h2";
  const size = small ? "text-lg font-semibold text-fg" : "section-title";
  return (
    <div className="grid max-w-3xl gap-1">
      {finding && (
        <p className="flex flex-wrap items-baseline gap-x-3 text-sm text-muted">
          <span aria-hidden className="font-semibold">
            {label}
          </span>
          {facts && <span>{facts}</span>}
        </p>
      )}
      <Heading className={`${size} text-balance`}>
        {finding ? (
          <>
            <span className="sr-only">{label}:</span> {finding}
          </>
        ) : (
          label
        )}
      </Heading>
      {!finding && facts && <p className="text-sm text-muted">{facts}</p>}
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  );
}
