import { describe, expect, it } from "vitest";
import { classifyEmailSignUp } from "./supabaseAuth";

describe("classifyEmailSignUp", () => {
  it("treats a session as a new account that is already signed in", () => {
    expect(
      classifyEmailSignUp(
        { user: { identities: [{ provider: "email" }] }, session: {} as never },
        null,
      ),
    ).toEqual({ status: "session" });
  });

  it("asks a new account to confirm when Supabase returns no session", () => {
    expect(
      classifyEmailSignUp({ user: { identities: [{ provider: "email" }] }, session: null }, null),
    ).toEqual({ status: "confirm_email" });
  });

  it("does not treat an existing email as a new account", () => {
    expect(classifyEmailSignUp({ user: { identities: [] }, session: null }, null)).toEqual({
      status: "existing",
    });
    expect(
      classifyEmailSignUp(null, { message: "User already registered" }),
    ).toEqual({ status: "existing" });
  });
});
