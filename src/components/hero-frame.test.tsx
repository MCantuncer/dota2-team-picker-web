import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CutOutline, HeroArt, HeroFace, HeroStage, LaneMark, laneCutOf, type HeroArtPlacement } from "./hero-frame";

const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";
const ANTI_MAGE = { heroId: 1, portrait: `${CDN}/antimage.png` }; // face at (370, 100) on a square render
const BROODMOTHER = { heroId: 61, portrait: `${CDN}/broodmother.png` }; // face at (330, 187) on a 720x360 render
const CARD: HeroArtPlacement = { width: 360, at: [0.5, 0.4] };

function renderArt(hero: { heroId: number; portrait: string }, placement = CARD) {
  const { container } = render(
    <HeroStage size={120}>
      <HeroArt {...hero} placement={placement} />
    </HeroStage>,
  );
  const img = container.querySelector("img");
  if (!img) throw new Error("no render");
  return img;
}

describe("HeroArt", () => {
  it("keeps the face point on the anchor when mirrored for the enemy side", () => {
    const { container } = render(
      <HeroStage size={120}>
        <HeroArt {...ANTI_MAGE} placement={CARD} mirror />
      </HeroStage>,
    );
    const img = container.querySelector("img")!;
    // Anti-Mage's face is 185px from the left at 360px wide, so 175px from the right once flipped.
    expect(img.style.left).toBe("calc(50% - 175px)");
    expect(img.style.transform).toBe("scaleX(-1)");
  });


  it("puts each hero's face point on the frame's anchor", () => {
    // At 360px the render is half the 720 space, so each face point moves by half its coordinates.
    const antiMage = renderArt(ANTI_MAGE);
    expect(antiMage.style.left).toBe("calc(50% - 185px)");
    expect(antiMage.style.top).toBe("calc(40% - 50px)");
    expect(antiMage.style.width).toBe("360px");

    const broodmother = renderArt(BROODMOTHER);
    expect(broodmother.style.left).toBe("calc(50% - 165px)");
    expect(broodmother.style.top).toBe("calc(40% - 94px)");
    expect(broodmother).toHaveAttribute("height", "180");
  });

  it("loads the render, not the portrait, and keeps it decorative", () => {
    const img = renderArt(ANTI_MAGE);
    expect(decodeURIComponent(img.getAttribute("src") ?? "")).toContain("/heroes/renders/antimage.png");
    expect(img).toHaveAttribute("alt", "");
  });

  it("centres a hero with no face point, and never draws past the render's pixels", () => {
    const img = renderArt({ heroId: 9999, portrait: `${CDN}/newhero.png` }, { width: 1000, at: [0.5, 0.5] });
    expect(img.style.width).toBe("720px");
    expect(img.style.left).toBe("calc(50% - 360px)");
    expect(img.style.top).toBe("calc(50% - 180px)");
  });
});

describe("HeroFace", () => {
  it("is a square of the size asked, named by the hero", () => {
    render(<HeroFace portrait={ANTI_MAGE.portrait} name="Anti-Mage" size={40} />);
    const img = screen.getByRole("img", { name: "Anti-Mage" });
    const frame = img.parentElement;
    expect(frame).toHaveStyle({ width: "40px", height: "40px" });
    expect(frame).toHaveAttribute("title", "Anti-Mage");
  });

  it("keeps its size between 20 and 64 px", () => {
    const { container } = render(
      <>
        <HeroFace portrait={ANTI_MAGE.portrait} name="Small" size={8} />
        <HeroFace portrait={ANTI_MAGE.portrait} name="Large" size={200} />
      </>,
    );
    const [small, large] = Array.from(container.querySelectorAll<HTMLElement>(".lane-cut"));
    expect(small).toHaveStyle({ width: "20px" });
    expect(large).toHaveStyle({ width: "64px" });
  });

  it("marks an enemy and a dimmed hero, and hides a decorative face from screen readers", () => {
    const { container } = render(
      <HeroFace portrait={ANTI_MAGE.portrait} name="Anti-Mage" isEnemy isDim isDecorative />,
    );
    expect(container.querySelector(".lane-cut")).toHaveClass("lane-cut-enemy");
    expect(container.querySelector("img")).toHaveClass("grayscale");
    expect(screen.queryByRole("img", { name: "Anti-Mage" })).toBeNull();
  });
});

describe("laneCutOf", () => {
  it("grows the cut and the corner with the frame", () => {
    expect(laneCutOf(20)).toEqual({ cut: 4, radius: 4 });
    expect(laneCutOf(40)).toEqual({ cut: 7, radius: 6 });
    expect(laneCutOf(200)).toEqual({ cut: 16, radius: 8 });
  });
});

describe("CutOutline", () => {
  it("draws solid corners and dashed edges, hidden from screen readers", () => {
    const { container } = render(<CutOutline width={160} height={90} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "0 0 160 90");
    const [corners, edges] = Array.from(container.querySelectorAll("path"));
    expect(corners).not.toHaveAttribute("stroke-dasharray");
    expect(edges).toHaveAttribute("stroke-dasharray", "4 3");
  });
});

describe("LaneMark", () => {
  it("takes its colour from the text colour", () => {
    const { container } = render(<LaneMark className="text-radiant" />);
    expect(container.querySelector("svg")).toHaveClass("text-radiant");
  });
});
