import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./proxy";

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

const request = (path: string) => new NextRequest(new URL(path, "https://dota2teampicker.com"));

describe("updateSession", () => {
  beforeEach(() => getUser.mockReset());

  it.each(["/profile", "/my-heroes", "/profile/settings"])("sends signed-out visitors from %s to login", async (path) => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await updateSession(request(path));
    expect(res.status).toBe(307);
    const to = new URL(res.headers.get("location")!);
    expect(to.pathname).toBe("/login");
    expect(to.searchParams.get("next")).toBe(path);
  });

  it("lets signed-out visitors open public pages", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await updateSession(request("/"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not treat lookalike paths as private", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await updateSession(request("/profiles-public"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets signed-in users through", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await updateSession(request("/profile"));
    expect(res.headers.get("location")).toBeNull();
  });
});
