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
        <span className="text-fg/90">Your name</span>
        <input
          name="name"
          defaultValue={name}
          autoComplete="nickname"
          maxLength={40}
          required
          autoFocus
          className="field h-10 text-base"
        />
        <span className="text-xs text-subtle">Your captain and team see this name.</span>
      </label>
      {askPassword && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg/90">Choose a password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            className="field h-10 text-base"
          />
          <span className="text-xs text-subtle">So you can log in again later with your email.</span>
        </label>
      )}
      {state.error && <p className="text-sm text-dire">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-lg mt-1"
      >
        {pending ? "Joining…" : "Join the team"}
      </button>
    </form>
  );
}
