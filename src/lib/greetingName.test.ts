import { describe, expect, it } from "vitest";
import { greetingFirstName } from "./greetingName";

describe("greetingFirstName", () => {
  it("skips an email local-part and greets without a name", () => {
    expect(
      greetingFirstName(
        ["jon.stanford.uk+trial8"],
        "jon.stanford.uk+trial8@gmail.com"
      )
    ).toBe("");
  });

  it("uses a real first name from the profile", () => {
    expect(greetingFirstName(["Ada Lovelace"], "ada@example.com")).toBe("Ada");
  });

  it("falls through an email-shaped profile name to a real given name", () => {
    expect(
      greetingFirstName(
        ["jon.stanford.uk+trial8", "Jonathan"],
        "jon.stanford.uk+trial8@gmail.com"
      )
    ).toBe("Jonathan");
  });
});
