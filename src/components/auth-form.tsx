"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/login/actions";

interface Props {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  next: string;
  askName?: boolean;
}

/** Email and password form shared by the login and sign up pages. */
export function AuthForm({ action, submitLabel, next, askName }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  if (state.message) {
    return <p className="rounded-md bg-emerald-900/40 p-3 text-emerald-200">{state.message}</p>;
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      {askName && (
        <Field label="Name" name="name" type="text" autoComplete="nickname" maxLength={40} required={false} />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={askName ? "new-password" : "current-password"}
        minLength={6}
      />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-600 disabled:opacity-60"
      >
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, required = true, ...input }: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-300">{label}</span>
      <input
        {...input}
        required={required}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none focus:border-red-600"
      />
    </label>
  );
}
