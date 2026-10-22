"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HARD_COUNTERS } from "@/lib/hard-counters";
import { HeroSearch } from "@/lib/hero-search";
import { Engine } from "@/lib/engine/score";
import { loadSnapshot } from "@/lib/engine/snapshot";
import type { HeroInfo, Position, RankBracket, Suggestion } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/client";

/** A team member as the captain sees them: favorite positions, and heroes per position (0 = any). */
export interface Member {
  id: string;
  name: string;
  positions: number[];
  heroes: Record<number, number[]>;
}

export interface Invite {
  id: string;
  email: string;
}

type Slots = (string | null)[];
interface Draft {
  picks: (number | null)[];
  enemies: number[];
  bans: number[];
}

const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft support", "Hard support"];
const RANKS = ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"];
const EMPTY_DRAFT: Draft = { picks: [null, null, null, null, null], enemies: [], bans: [] };
const DRAFT_KEY = "captain-draft";
const PER_FRIEND = 4;

interface Note {
  kind: "warn" | "bad" | "good";
  text: string;
}
type Card = Suggestion & { notes: Note[] };

/** Captain mode: one person enters the whole draft and gets picks to call for each member's open position. */
export function CaptainBoard({
  team,
  initialMembers,
  initialInvites,
  initialSlots,
  initialRank,
}: {
  team: { id: string; name: string };
  initialMembers: Member[];
  initialInvites: Invite[];
  initialSlots: Slots;
  initialRank: number | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"draft" | "team">(initialMembers.length ? "draft" : "team");
  const [members, setMembers] = useState(initialMembers);
  const [slots, setSlots] = useState<Slots>(initialSlots);
  const [rank, setRank] = useState<number | null>(initialRank);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadSnapshot()
      .then((s) => {
        try {
          const saved = localStorage.getItem(DRAFT_KEY);
          if (saved) setDraft(JSON.parse(saved));
        } catch {
          // A fresh draft is fine.
        }
        setEngine(new Engine(s));
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  const updateDraft = (next: Draft) => {
    setDraft(next);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // Not saving the draft in this browser is fine.
    }
  };

  const search = useMemo(() => {
    if (!engine) return null;
    const picks = (id: number) => (engine.data.bracketStats[id]?.picks ?? []).reduce((s, x) => s + x, 0);
    return new HeroSearch(engine.heroes, picks);
  }, [engine]);

  const saveLineup = async (nextSlots: Slots, nextRank: number | null) => {
    setSlots(nextSlots);
    setRank(nextRank);
    const { error } = await supabase
      .from("team_lineups")
      .upsert({ team_id: team.id, slots: nextSlots, rank_bracket: nextRank });
    setSaveError(error ? `Current team not saved: ${error.message}` : null);
  };

  if (loadError) return <Shell><p className="text-red-400">{loadError}. Reload the page to try again.</p></Shell>;
  if (!engine || !search) return <Shell><p className="text-zinc-400">Loading hero data…</p></Shell>;

  return (
    <Shell
      tabs={
        <div className="flex gap-1" role="tablist">
          {(["draft", "team"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ring-1 ${
                tab === t ? "bg-zinc-800 text-zinc-100 ring-zinc-500" : "text-zinc-400 ring-zinc-700 hover:text-zinc-100"
              }`}
            >
              {t === "draft" ? "Draft" : "Team"}
            </button>
          ))}
        </div>
      }
    >
      {saveError && <p className="text-sm text-red-400">{saveError}</p>}
      {tab === "draft" ? (
        <DraftView
          engine={engine}
          search={search}
          members={members}
          slots={slots}
          rank={rank}
          draft={draft}
          onDraft={updateDraft}
          onLineup={saveLineup}
        />
      ) : (
        <TeamView
          engine={engine}
          team={team}
          members={members}
          initialInvites={initialInvites}
          onMembers={setMembers}
          onError={setSaveError}
          onRemoved={(id) => saveLineup(slots.map((s) => (s === id ? null : s)), rank)}
        />
      )}
    </Shell>
  );
}

function Shell({ tabs, children }: { tabs?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-zinc-800 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Captain mode</h1>
        <span className="font-mono text-xs text-zinc-500">admin</span>
        <div className="ml-auto">{tabs}</div>
      </div>
      {children}
    </main>
  );
}

// ---------- draft ----------

function DraftView({
  engine,
  search,
  members,
  slots,
  rank,
  draft,
  onDraft,
  onLineup,
}: {
  engine: Engine;
  search: HeroSearch<HeroInfo>;
  members: Member[];
  slots: Slots;
  rank: number | null;
  draft: Draft;
  onDraft: (d: Draft) => void;
  onLineup: (slots: Slots, rank: number | null) => void;
}) {
  const enemyRef = useRef<HTMLInputElement>(null);
  const bansRef = useRef<HTMLInputElement>(null);
  const memberById = (id: string | null) => members.find((m) => m.id === id);
  const taken = new Set([...draft.picks.filter((x): x is number => x != null), ...draft.enemies, ...draft.bans]);
  const name = (id: number) => engine.hero(id).name;

  const columns = useMemo(
    () => suggestColumns(engine, members, slots, rank, draft),
    [engine, members, slots, rank, draft],
  );

  const setPick = (i: number, id: number | null) => {
    const picks = draft.picks.slice();
    picks[i] = id;
    onDraft({ ...draft, picks });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500">
        Type 2–3 letters and press <Kbd>Enter</Kbd>. <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> pick another match, <Kbd>Esc</Kbd> clears, <Kbd>Backspace</Kbd> in an empty enemy or ban box
        removes the last one. Bans take several names at once.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label="Our team" className="rounded-lg border border-zinc-800 border-t-green-500 border-t-[3px] bg-zinc-900/60 p-3">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider">Our team</h2>
          {draft.picks.map((pick, i) => {
            const member = memberById(slots[i] ?? null);
            return (
              <div key={i} className="grid grid-cols-[minmax(9rem,13rem)_1fr] items-center gap-3 border-t border-zinc-800 py-1.5 first-of-type:border-t-0">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="w-3 font-mono text-xs text-green-400">{i + 1}</span>
                  <span className={`truncate font-semibold ${member ? "" : "text-zinc-500"}`}>
                    {member?.name ?? "Not in team"}
                  </span>
                  <span className="text-xs text-zinc-500">{POSITION_NAMES[i]}</span>
                </div>
                {pick != null ? (
                  <Chip label={name(pick)} tone="ours" onRemove={() => setPick(i, null)} />
                ) : (
                  <HeroInput
                    id={`slot-${i + 1}`}
                    placeholder={`Pos ${i + 1} pick`}
                    search={search}
                    exclude={taken}
                    onPick={(id) => {
                      setPick(i, id);
                      enemyRef.current?.focus();
                    }}
                  />
                )}
              </div>
            );
          })}
        </section>

        <section aria-label="Enemy team" className="rounded-lg border border-zinc-800 border-t-red-500 border-t-[3px] bg-zinc-900/60 p-3">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider">
            Enemy <span className="font-mono text-xs text-zinc-500">{draft.enemies.length}/5</span>
          </h2>
          {draft.enemies.length < 5 && (
            <HeroInput
              id="enemy"
              inputRef={enemyRef}
              placeholder="Enemy pick"
              search={search}
              exclude={taken}
              onPick={(id) => onDraft({ ...draft, enemies: [...draft.enemies, id] })}
              onUndo={() => onDraft({ ...draft, enemies: draft.enemies.slice(0, -1) })}
            />
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.enemies.map((id) => (
              <Chip key={id} label={name(id)} tone="foe" onRemove={() => onDraft({ ...draft, enemies: draft.enemies.filter((x) => x !== id) })} />
            ))}
          </div>

          <h3 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Bans <span className="font-mono text-zinc-500">{draft.bans.length}</span>
          </h3>
          <HeroInput
            id="bans"
            inputRef={bansRef}
            placeholder="Bans, e.g. pa sf am"
            search={search}
            exclude={taken}
            multi
            onPick={(id) => onDraft({ ...draft, bans: draft.bans.includes(id) ? draft.bans : [...draft.bans, id] })}
            onPickMany={(ids) => onDraft({ ...draft, bans: [...draft.bans, ...ids.filter((id) => !draft.bans.includes(id))] })}
            onUndo={() => onDraft({ ...draft, bans: draft.bans.slice(0, -1) })}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.bans.map((id) => (
              <Chip key={id} label={name(id)} tone="ban" onRemove={() => onDraft({ ...draft, bans: draft.bans.filter((x) => x !== id) })} />
            ))}
          </div>
        </section>
      </div>

      <section aria-label="Suggestions" className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Call these</h2>
        {!members.length ? (
          <p className="text-sm text-zinc-500">Invite your friends on the Team tab, then pick who plays under Current team.</p>
        ) : !columns.length ? (
          <p className="text-sm text-zinc-500">
            {slots.some(Boolean) ? "Everyone in the team has picked. Good luck!" : "Pick who plays which position under Current team to get suggestions."}
          </p>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]">
            {columns.map((col) => (
              <div key={col.position} className="flex min-w-0 flex-col gap-2">
                <div className="font-semibold">
                  {col.member.name} <span className="font-mono text-xs text-zinc-500">pos {col.position}</span>
                </div>
                {col.cards.map((card, n) => (
                  <SuggestionCard
                    key={card.heroId}
                    card={card}
                    top={n === 0}
                    onPicked={() => setPick(col.position - 1, card.heroId)}
                    onBanned={() => onDraft({ ...draft, bans: [...draft.bans, card.heroId] })}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Lineup" className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider">Current team</h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]">
          {slots.map((memberId, i) => (
            <label key={i} className="flex flex-col gap-1 text-xs text-zinc-400">
              Pos {i + 1} · {POSITION_NAMES[i]}
              <select
                id={`lineup-${i + 1}`}
                value={memberId ?? ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  onLineup(slots.map((s, j) => (j === i ? v : s === v ? null : s)), rank);
                }}
                className="rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 ring-1 ring-zinc-700"
              >
                <option value="">Not in team</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.positions.length ? ` (${m.positions.join(", ")})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Party rank
            <select
              id="party-rank"
              value={rank ?? ""}
              onChange={(e) => onLineup(slots, e.target.value ? Number(e.target.value) : null)}
              className="rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 ring-1 ring-zinc-700"
            >
              <option value="">All ranks</option>
              {RANKS.map((r, i) => (
                <option key={r} value={i + 1}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const next: Slots = [null, null, null, null, null];
              // Members already chosen keep playing; each goes to their first favorite position that is free.
              const playing = members.filter((m) => slots.includes(m.id));
              for (const m of playing.length ? playing : members) {
                const pos = m.positions.find((p) => next[p - 1] == null);
                if (pos) next[pos - 1] = m.id;
              }
              onLineup(next, rank);
            }}
            className="rounded-md px-3 py-1.5 text-sm font-semibold ring-1 ring-zinc-600 hover:bg-zinc-800"
          >
            Fill from favorite positions
          </button>
          <button
            onClick={() => {
              onDraft(EMPTY_DRAFT);
              bansRef.current?.focus();
            }}
            className="rounded-md px-3 py-1.5 text-sm font-semibold ring-1 ring-zinc-600 hover:bg-zinc-800"
          >
            New draft
          </button>
        </div>
      </section>
    </div>
  );
}

/** One column of suggestions per member who still has to pick. Each hero goes to the member it scores highest for. */
function suggestColumns(engine: Engine, members: Member[], slots: Slots, rank: number | null, draft: Draft) {
  const allies = draft.picks.flatMap((heroId, i) => (heroId != null ? [{ heroId, position: (i + 1) as Position }] : []));
  const open = slots.flatMap((memberId, i) => {
    const member = members.find((m) => m.id === memberId);
    return member && draft.picks[i] == null ? [{ member, position: (i + 1) as Position }] : [];
  });
  const lists = open.map(({ member, position }) =>
    engine
      .suggest({
        myPosition: position,
        allies,
        enemies: draft.enemies,
        bans: draft.bans,
        rankBracket: (rank ?? undefined) as RankBracket | undefined,
        favorites: [...(member.heroes[position] ?? []), ...(member.heroes[0] ?? [])],
        count: 12,
      })
      .map((s) => ({ ...s, notes: counterNotes(engine, s.heroId, draft) })),
  );
  const best = new Map<number, { col: number; score: number }>();
  lists.forEach((list, col) =>
    list.forEach((s) => {
      const b = best.get(s.heroId);
      if (!b || b.score < s.score) best.set(s.heroId, { col, score: s.score });
    }),
  );
  return open.map((o, col) => ({
    ...o,
    cards: lists[col]!.filter((s) => best.get(s.heroId)!.col === col).slice(0, PER_FRIEND) as Card[],
  }));
}

function counterNotes(engine: Engine, heroId: number, draft: Draft): Note[] {
  const hero = engine.hero(heroId).name;
  const notes: Note[] = [];
  for (const hc of HARD_COUNTERS) {
    if (hc.hero !== hero) continue;
    const counter = engine.heroes.find((h) => h.name === hc.counter);
    if (!counter) continue;
    if (draft.enemies.includes(counter.id)) notes.push({ kind: "bad", text: `Hard countered: ${counter.name} is on the enemy team` });
    else if (draft.bans.includes(counter.id) || draft.picks.includes(counter.id))
      notes.push({ kind: "good", text: `${counter.name} is out, safe to pick` });
    else if (draft.enemies.length < 5) notes.push({ kind: "warn", text: `Gamble: ${counter.name} still available` });
  }
  return notes;
}

function SuggestionCard({ card, top, onPicked, onBanned }: { card: Card; top: boolean; onPicked: () => void; onBanned: () => void }) {
  const tone = { warn: "bg-amber-950/60 text-amber-300", bad: "bg-red-950/60 text-red-300", good: "bg-green-950/60 text-green-300" };
  return (
    <article className={`flex flex-col gap-1.5 rounded-lg border bg-zinc-900 p-2.5 ${top ? "border-amber-500/70" : "border-zinc-800"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold leading-tight">{card.name}</span>
        <span className="font-mono text-xs tabular-nums text-zinc-500" title="Score in win-rate points">
          {card.score >= 0 ? "+" : ""}
          {card.score.toFixed(1)}
        </span>
      </div>
      <ul className="flex flex-col gap-0.5 text-[13px] text-zinc-300">
        {card.reasons.slice(0, 3).map((r) => (
          <li key={r} className={r.startsWith("Watch out") ? "text-zinc-500" : ""}>
            · {r}
          </li>
        ))}
      </ul>
      {card.notes.map((n) => (
        <p key={n.text} className={`rounded px-1.5 py-0.5 text-xs ${tone[n.kind]}`}>
          {n.text}
        </p>
      ))}
      <div className="flex gap-1.5 pt-0.5">
        <button onClick={onPicked} className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-zinc-950 hover:bg-amber-400">
          Picked
        </button>
        <button onClick={onBanned} className="rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-zinc-700 hover:bg-zinc-800">
          Banned
        </button>
      </div>
    </article>
  );
}

// ---------- team ----------

const POSITION_SHORT = ["Carry", "Mid", "Off", "Soft sup", "Hard sup"];

function TeamView({
  engine,
  team,
  members,
  initialInvites,
  onMembers,
  onError,
  onRemoved,
}: {
  engine: Engine;
  team: { id: string; name: string };
  members: Member[];
  initialInvites: Invite[];
  onMembers: (m: Member[]) => void;
  onError: (e: string | null) => void;
  onRemoved: (id: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [teamName, setTeamName] = useState(team.name);
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState(initialInvites);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const rename = async () => {
    const name = teamName.trim();
    if (!name || name === team.name) return;
    const { error } = await supabase.from("teams").update({ name }).eq("id", team.id);
    onError(error ? `Team name not saved: ${error.message}` : null);
  };

  const invite = async (address: string) => {
    setSending(true);
    setSent(null);
    const { data, error } = await supabase.functions.invoke<Invite>("team-invite", { body: { teamId: team.id, email: address } });
    setSending(false);
    if (error || !data) {
      const body = error && "context" in error ? await (error.context as Response).json().catch(() => null) : null;
      return onError(`Invite not sent: ${body?.error ?? error?.message ?? "unknown error"}`);
    }
    onError(null);
    setEmail("");
    setSent(data.email);
    setInvites((cur) => (cur.some((i) => i.id === data.id) ? cur : [...cur, { id: data.id, email: data.email }]));
  };

  const cancel = async (i: Invite) => {
    setInvites((cur) => cur.filter((x) => x.id !== i.id));
    const { error } = await supabase.from("team_invites").delete().eq("id", i.id);
    onError(error ? `Invite not cancelled: ${error.message}` : null);
  };

  const copyLink = async (i: Invite) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${i.id}`);
      setCopied(i.id);
    } catch {
      onError("Could not copy the link.");
    }
  };

  const remove = async (m: Member) => {
    onMembers(members.filter((x) => x.id !== m.id));
    onRemoved(m.id);
    const { error } = await supabase.from("team_members").delete().eq("team_id", team.id).eq("user_id", m.id);
    onError(error ? `Member not removed: ${error.message}` : null);
  };

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <label className="flex max-w-sm flex-col gap-1 text-xs text-zinc-400">
        Team name
        <input
          id="team-name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          maxLength={40}
          className="rounded-md bg-zinc-800 px-3 py-2 text-base text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </label>

      <section aria-label="Invite" className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Invite a friend</h2>
        <p className="text-sm text-zinc-400">
          They get an email with a link, pick a name and password, then their positions and heroes. Teams can have
          any number of members; you choose who plays each game on the Draft tab.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) invite(email.trim());
          }}
          className="flex gap-2"
        >
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            autoComplete="off"
            className="flex-1 rounded-md bg-zinc-800 px-3 py-2 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-md bg-amber-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send invite"}
          </button>
        </form>
        {sent && <p className="text-sm text-green-400">Invite sent to {sent}.</p>}
        {invites.length > 0 && (
          <ul className="flex flex-col divide-y divide-zinc-800 text-sm">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 py-1.5">
                <span className="mr-auto truncate">{i.email}</span>
                <span className="text-xs text-zinc-500">Waiting</span>
                <button onClick={() => invite(i.email)} disabled={sending} className="rounded-md px-2 py-1 text-xs ring-1 ring-zinc-700 hover:bg-zinc-800">
                  Resend
                </button>
                <button onClick={() => copyLink(i)} className="rounded-md px-2 py-1 text-xs ring-1 ring-zinc-700 hover:bg-zinc-800">
                  {copied === i.id ? "Copied" : "Copy link"}
                </button>
                <button onClick={() => cancel(i)} className="rounded-md px-2 py-1 text-xs ring-1 ring-zinc-700 hover:bg-zinc-800">
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Members" className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Members <span className="font-mono text-xs text-zinc-500">{members.length}</span>
        </h2>
        {!members.length && <p className="text-sm text-zinc-500">Nobody has joined yet.</p>}
        {members.map((m) => (
          <article key={m.id} className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="mr-auto text-lg">{m.name}</strong>
              <button onClick={() => remove(m)} className="rounded-md px-2 py-1 text-xs ring-1 ring-zinc-700 hover:bg-zinc-800">
                Remove
              </button>
            </div>
            {!m.positions.length && <p className="text-sm text-zinc-500">Hasn&apos;t picked positions yet.</p>}
            <dl className="grid gap-1.5 text-sm sm:grid-cols-[7rem_1fr]">
              {m.positions.map((p) => (
                <div key={p} className="contents">
                  <dt className="text-zinc-400">
                    <span className="font-mono text-green-400">{p}</span> {POSITION_SHORT[p - 1]}
                  </dt>
                  <dd className="text-zinc-200">
                    {(m.heroes[p] ?? []).map((id) => engine.hero(id).name).join(", ") || <span className="text-zinc-500">No heroes yet</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </section>
    </div>
  );
}

// ---------- shared pieces ----------

/**
 * Hero search box: Enter adds the top match, arrows choose another, Esc clears, Backspace on an empty
 * box undoes the last add. With `multi`, Enter adds every name typed, separated by spaces.
 */
function HeroInput({
  id,
  placeholder,
  search,
  exclude,
  multi,
  onPick,
  onPickMany,
  onUndo,
  inputRef,
}: {
  id: string;
  placeholder: string;
  search: HeroSearch<HeroInfo>;
  exclude: Set<number>;
  multi?: boolean;
  onPick: (heroId: number) => void;
  onPickMany?: (heroIds: number[]) => void;
  onUndo?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [value, setValue] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const lastWord = multi ? (value.trimEnd().split(/\s+/).at(-1) ?? "") : value;
  const results: HeroInfo[] = search.find(lastWord, exclude);

  const choose = (hero: HeroInfo) => {
    onPick(hero.id);
    setValue(multi ? value.trimEnd().split(/\s+/).slice(0, -1).map((w) => w + " ").join("") : "");
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (multi && onPickMany) {
        const picked: number[] = [];
        for (const word of value.trim().split(/\s+/).filter(Boolean)) {
          const hit = search.find(word, new Set([...exclude, ...picked]), 1)[0];
          if (hit) picked.push(hit.id);
        }
        if (picked.length) onPickMany(picked);
        setValue("");
      } else if (results[active]) choose(results[active]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Escape") {
      setValue("");
    } else if (e.key === "Backspace" && !value && onUndo) {
      e.preventDefault();
      onUndo();
    }
  };

  return (
    <div className="relative min-w-0">
      <input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-md bg-zinc-800 px-3 py-1.5 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      {open && results.length > 0 && (
        <ul role="listbox" className="absolute inset-x-0 top-full z-10 mt-0.5 rounded-md bg-zinc-800 p-1 shadow-lg ring-1 ring-zinc-700">
          {results.map((h, i) => (
            <li
              key={h.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(h);
              }}
              className={`flex cursor-pointer justify-between rounded px-2 py-1 text-sm ${i === active ? "bg-zinc-700" : ""}`}
            >
              {h.name}
              {i === 0 && <Kbd>Enter</Kbd>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ label, tone, onRemove }: { label: string; tone?: "ours" | "foe" | "ban"; onRemove: () => void }) {
  const tones = {
    ours: "bg-green-950/60 ring-green-600",
    foe: "bg-red-950/60 ring-red-600",
    ban: "text-zinc-500 line-through ring-zinc-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-sm font-medium ring-1 ${tone ? tones[tone] : "bg-zinc-800 ring-zinc-700"}`}>
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label}`} className="px-1.5 text-zinc-400 hover:text-zinc-100">
        ×
      </button>
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="mx-0.5 rounded border border-zinc-700 px-1 font-mono text-[11px] text-zinc-400">{children}</kbd>;
}
