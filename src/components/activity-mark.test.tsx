import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const sent = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    // Like a real Supabase query: nothing is sent until `then` is called.
    rpc: (name: string) => ({
      then: (ok: (v: unknown) => unknown) => {
        sent(name);
        return Promise.resolve(ok({ data: null, error: null }));
      },
    }),
  }),
}));

import { ActivityMark } from "./activity-mark";

describe("ActivityMark", () => {
  it("sends mark_active, not just builds it", () => {
    render(<ActivityMark />);
    expect(sent).toHaveBeenCalledWith("mark_active");
  });
});
