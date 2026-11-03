import type { Finding, PlayerFeedback } from "@/lib/player-feedback";

/** Games a strength or problem needs behind it (backend MIN_TREND_GAMES). */
export const MIN_GAMES = 4;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const day = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : null);

/**
 * The player's strengths and problems over their recent games. Each item shows its headline and
 * pattern; the moments, the cost and what to change open below it.
 */
export function FeedbackView({ feedback }: { feedback: PlayerFeedback }) {
  const first = day(feedback.firstGameAt);
  const last = day(feedback.lastGameAt);
  const range = first && last && first !== last ? `${first} to ${last}` : last;
  const hasFindings = feedback.strengths.length + feedback.problems.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted">
        From your last <span className="num text-fg">{feedback.games}</span> games{range ? `, ${range}` : ""}.{" "}
        <span className="num">{feedback.parsedGames}</span> of them parsed by OpenDota, which the detailed points need.
      </p>

      {feedback.improved.length > 0 && (
        <section aria-labelledby="feedback-improved" className="flex flex-col gap-2">
          <h2 id="feedback-improved" className="label-caps">
            Better Than Last Week
          </h2>
          <ul className="flex flex-wrap gap-2">
            {feedback.improved.map((i) => (
              <li key={i.kind} className="rounded-sm bg-radiant-tint px-2.5 py-1 text-sm text-fg">
                {i.headline}: gone this week
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasFindings ? (
        <p role="status" className="notice">
          Nothing stood out in these games: no number was far enough from the average to call it a strength or a problem.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <FindingList id="feedback-strengths" title="Strengths" tone="strength" findings={feedback.strengths} />
          <FindingList id="feedback-problems" title="Problems" tone="problem" findings={feedback.problems} />
        </div>
      )}
    </div>
  );
}

function FindingList({ id, title, tone, findings }: { id: string; title: string; tone: Finding["tone"]; findings: Finding[] }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <h2 id={id} className="section-title flex items-center gap-2">
        <span aria-hidden className={`size-2 rounded-full ${tone === "strength" ? "bg-radiant" : "bg-dire"}`} />
        {title}
      </h2>
      {findings.length === 0 ? (
        <p className="text-sm text-subtle">{tone === "strength" ? "None stood out yet." : "None stood out. Keep it up."}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {findings.map((f) => (
            <li key={f.kind}>
              <FindingCard finding={f} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const isProblem = finding.tone === "problem";
  return (
    <article className={`card flex flex-col gap-2 border-l-2 p-4 ${isProblem ? "border-l-dire" : "border-l-radiant"}`}>
      <h3 className="text-base font-semibold text-fg">{finding.headline}</h3>
      {finding.pattern && <p className="text-sm text-muted">{finding.pattern}</p>}
      <details className="group text-sm">
        <summary className="link w-fit cursor-pointer">Show Details</summary>
        <div className="mt-3 flex flex-col gap-3">
          {finding.happened.length > 0 && (
            <Part title="What Happened">
              <ul className="flex flex-col gap-1">
                {finding.happened.map((line, i) => (
                  <li key={i} className="num text-muted">
                    {line}
                  </li>
                ))}
              </ul>
            </Part>
          )}
          {finding.cost && (
            <Part title={isProblem ? "What It Cost" : "What It Gave You"}>
              <p className="text-muted">{finding.cost}</p>
            </Part>
          )}
          {finding.change && (
            <Part title="What to Change">
              <p className="text-fg">{finding.change}</p>
            </Part>
          )}
        </div>
      </details>
    </article>
  );
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="label-caps">{title}</h4>
      {children}
    </div>
  );
}
