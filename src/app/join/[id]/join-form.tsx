"use client";

import { useActionState } from "react";
import { joinTeam } from "./actions";

/** Name and, for a new account, a password; then joins the team. */
export function JoinForm({ invite, name, askPassword }: { invite: string; name: string; askPassword: boolean }) {
  const [state, action, pending] = useActionState(joinTeam, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="invite" value={invite} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-300">Your name</span>
        <input
          name="name"
          defaultValue={name}
          autoComplete="nickname"
          maxLength={40}
          required
          autoFocus
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none focus:border-red-600"
        />
        <span className="text-xs text-zinc-500">Your captain and team see this name.</span>
      </label>
      {askPassword && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-300">Choose a password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none focus:border-red-600"
          />
          <span className="text-xs text-zinc-500">So you can log in again later with your email.</span>
        </label>
      )}
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-600 disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join the team"}
      </button>
    </form>
  );
}
