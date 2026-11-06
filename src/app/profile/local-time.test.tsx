import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocalTime } from "./local-time";

const ISO = "2026-11-05T13:58:14Z";

describe("LocalTime", () => {
  it("shows the time in the browser's own zone, not UTC", () => {
    render(<LocalTime iso={ISO} />);
    const local = new Date(ISO).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    expect(screen.getByText(local)).toHaveAttribute("dateTime", ISO);
    expect(screen.queryByText(/UTC/)).toBeNull();
  });

  it("labels the server's first paint as UTC, since the server can't know the viewer's zone", () => {
    expect(renderToString(<LocalTime iso={ISO} />)).toContain(
      "5 Nov 2026, 13:58 UTC",
    );
  });

  it("shows nothing for a time it can't read", () => {
    const { container } = render(<LocalTime iso="not a date" />);
    expect(container).toBeEmptyDOMElement();
  });
});
