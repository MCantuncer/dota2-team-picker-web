import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AfterGame } from "./after-game";

describe("AfterGame", () => {
  it("looks for the result and shows why nothing was saved", async () => {
    const onFind = vi.fn().mockResolvedValue("No finished game found yet.");
    render(<AfterGame result={null} checking={false} onFind={onFind} />);

    await userEvent.click(screen.getByRole("button", { name: "Find result" }));
    expect(onFind).toHaveBeenCalledWith(undefined);
    expect(await screen.findByRole("status")).toHaveTextContent("No finished game found yet.");
  });

  it("checks a pasted match ID and refuses anything else", async () => {
    const onFind = vi.fn().mockResolvedValue(null);
    render(<AfterGame result={null} checking={false} onFind={onFind} />);
    const input = screen.getByLabelText("Or paste the match ID");

    await userEvent.type(input, "abc");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onFind).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("A match ID is a number");

    await userEvent.clear(input);
    await userEvent.type(input, " 8012345678 ");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onFind).toHaveBeenCalledWith(8012345678);
  });

  it("shows a saved result with links to the match and its report", () => {
    render(<AfterGame result={{ draftId: "d1", matchId: 8012345678, won: false }} checking={false} onFind={vi.fn()} />);
    expect(screen.getByText("Lost")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Match 8012345678 on OpenDota/ })).toHaveAttribute(
      "href",
      "https://www.opendota.com/matches/8012345678",
    );
    expect(screen.getByRole("link", { name: "Read the report" })).toHaveAttribute("href", "/reports/d1");
    expect(screen.queryByRole("button", { name: "Find result" })).not.toBeInTheDocument();
  });
});
