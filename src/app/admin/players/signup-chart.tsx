import { addDays, shortDate, type SignupStats } from "@/lib/admin-players";

/** One bar per day for the last 14 days, today brightest, each with its count above it. */
export function SignupChart({ stats }: { stats: SignupStats }) {
  const most = Math.max(1, ...stats.perDay);
  const days = stats.perDay.map((n, i) => ({ date: addDays(stats.firstDay, i), n }));
  const last = days.length - 1;
  const summary = days.map((d) => `${shortDate(d.date)}: ${d.n}`).join(", ");

  return (
    <div className="card flex flex-col gap-2 px-5 pb-3 pt-5">
      <div role="img" aria-label={`Signups per day. ${summary}`} className="grid h-44 grid-cols-14 items-end gap-1 border-b border-line-strong pt-5 sm:gap-2.5">
        {days.map((d, i) => (
          <div key={d.date} aria-hidden className="relative flex h-full flex-col items-center justify-end">
            {/* Empty days keep the line but drop the "0", so the days with signups stand out. */}
            <span className={`num mb-1 h-4 text-xs ${i === last ? "text-fg" : "text-muted"}`}>{d.n > 0 ? d.n : ""}</span>
            <span
              className={`w-full max-w-10 rounded-t-sm ${i === last ? "bg-accent" : "bg-accent-deep"}`}
              style={{ height: `${(d.n / most) * 100}%`, minHeight: 3 }}
            />
            <span className={`num absolute -bottom-6 text-xs ${i === last ? "font-medium text-fg" : "font-normal text-subtle"}`}>
              {Number(d.date.slice(8))}
            </span>
          </div>
        ))}
      </div>
      <div aria-hidden className="flex justify-between pt-5 text-xs text-subtle">
        <span>{shortDate(days[0]?.date ?? stats.firstDay).split(" ")[1]}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** Total, today and the last 7 days, the total brightest. */
export function SignupStrip({ stats }: { stats: SignupStats }) {
  const cells = [
    { label: "Total Players", value: stats.total, detail: "Everyone with Steam linked", lead: true },
    { label: "New Today", value: stats.today, detail: "Since 00:00", lead: false },
    {
      label: "New in 7 Days",
      value: stats.last7Days,
      detail: `${shortDate(addDays(stats.firstDay, 7))} to ${shortDate(addDays(stats.firstDay, 13))}`,
      lead: false,
    },
  ];
  return (
    <dl className="card grid grid-cols-1 sm:grid-cols-3">
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 border-line px-5 py-4 not-first:border-t sm:flex-col sm:items-start sm:justify-start sm:gap-1 sm:px-6 sm:py-5 sm:not-first:border-l sm:not-first:border-t-0"
        >
          <dt className="text-sm font-medium text-muted">{c.label}</dt>
          <dd className={`num order-none text-3xl leading-tight tracking-tight sm:text-4xl ${c.lead ? "text-accent" : "text-fg"}`}>{c.value}</dd>
          <dd className="w-full text-xs text-subtle">{c.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
