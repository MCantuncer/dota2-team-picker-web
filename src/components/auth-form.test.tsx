import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  it("asks for email and password with the right autocomplete hints", () => {
    render(<AuthForm action={vi.fn()} submitLabel="Log in" next="/" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("asks for an optional name and a new password on sign up", () => {
    render(<AuthForm action={vi.fn()} submitLabel="Sign up" next="/" askName />);
    expect(screen.getByLabelText("Name")).not.toBeRequired();
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
  });

  it("sends the form with the next page and shows the error it gets back", async () => {
    const action = vi.fn().mockResolvedValue({ error: "Invalid login credentials" });
    render(<AuthForm action={action} submitLabel="Log in" next="/profile" />);

    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid login credentials")).toBeInTheDocument();
    const form: FormData = action.mock.calls[0][1];
    expect(form.get("email")).toBe("ana@example.com");
    expect(form.get("next")).toBe("/profile");
  });

  it("replaces the form with the message it gets back", async () => {
    const action = vi.fn().mockResolvedValue({ message: "Check your email" });
    render(<AuthForm action={action} submitLabel="Sign up" next="/" />);

    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
