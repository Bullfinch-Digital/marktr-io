import { describe, expect, it } from "vitest";
import { generatePublicToken } from "../../supabase/functions/_shared/publicToken.ts";

describe("generatePublicToken", () => {
  it("uses crypto.getRandomValues and is at least 32 base64url characters", () => {
    const token = generatePublicToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("is unique across draws", () => {
    const a = generatePublicToken();
    const b = generatePublicToken();
    expect(a).not.toBe(b);
  });
});
