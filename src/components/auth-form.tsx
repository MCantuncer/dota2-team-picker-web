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
    return <p className="rounded-md bg-radiant/10 p-3 text-radiant">{state.message}</p>;
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
      {state.error && <p className="text-sm text-dire">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-lg mt-1"
      >
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, required = true, ...input }: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-fg/90">{label}</span>
      <input
        {...input}
        required={required}
        className="field h-10 text-base"
      />
    </label>
  );
}
