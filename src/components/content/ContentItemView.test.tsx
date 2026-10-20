import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { contentItemPlainText } from "../../utils/exportContent";
import { ContentItemView } from "./ContentItemView";

afterEach(() => cleanup());

const carousel = {
  slides: [
    { slide_text: "Start with the pour.", visual_direction: "Close-up of the first drop." },
    { slide_text: "Name the customer.", visual_direction: "Quiet kitchen table." },
  ],
  caption: "A caption for the set.",
  cta: "Save this.",
};

describe("ContentItemView hierarchy", () => {
  it("renders item headers, field labels and values without changing copy text", () => {
    render(<ContentItemView type="ig_carousel" content={carousel} />);

    expect(screen.getByRole("heading", { name: "Slide 1" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Slide 2" })).toBeTruthy();
    expect(screen.getAllByText("Slide text").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Visual direction").length).toBeGreaterThan(0);
    expect(screen.getByText("Start with the pour.")).toBeTruthy();
    expect(screen.getByText("Close-up of the first drop.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Copy" })).toBeNull();

    expect(contentItemPlainText("ig_carousel", "Weekend pour", carousel)).toContain(
      "Slide 1 — text\nStart with the pour."
    );
    expect(contentItemPlainText("ig_carousel", "Weekend pour", carousel)).toContain(
      "Slide 1 — visual direction\nClose-up of the first drop."
    );
  });
});
