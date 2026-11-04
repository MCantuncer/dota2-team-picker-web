import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FaceStack } from "./face-stack";

describe("FaceStack", () => {
  it("shows three faces, then how many more", () => {
    const { container } = render(<FaceStack icons={["/a.png", "/b.png", "/c.png", "/d.png", "/e.png"]} />);
    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(container.textContent).toBe("+2");
  });

  it("shows nothing without faces", () => {
    const { container } = render(<FaceStack icons={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
