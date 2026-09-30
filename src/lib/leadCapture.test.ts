import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const isGuestLeadCaptured = vi.fn(() => false);
const markGuestLeadCaptured = vi.fn();

vi.mock("../config/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invoke(...args),
    },
  },
}));

vi.mock("./guestContext", () => ({
  isGuestLeadCaptured: () => isGuestLeadCaptured(),
  markGuestLeadCaptured: () => markGuestLeadCaptured(),
}));

import { captureGuestLeadOnce, upsertOnboardingLead } from "./leadCapture";

describe("leadCapture payload", () => {
  beforeEach(() => {
    invoke.mockReset();
    isGuestLeadCaptured.mockReset();
    isGuestLeadCaptured.mockReturnValue(false);
    markGuestLeadCaptured.mockReset();
  });

  it("sends Turnstile as body.token, not turnstileToken", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });

    await upsertOnboardingLead("guest@example.com", {
      token: "fresh-token",
      source: "health-check",
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][0]).toBe("capture-onboarding-lead");
    const payload = (invoke.mock.calls[0][1] as { body: Record<string, unknown> }).body;
    expect(payload.token).toBe("fresh-token");
    expect(payload).not.toHaveProperty("turnstileToken");
  });

  it("shares one in-flight capture-onboarding-lead request", async () => {
    let resolveInvoke: (value: { data: { ok: boolean }; error: null }) => void = () => {};
    invoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInvoke = resolve;
        }),
    );

    const p1 = captureGuestLeadOnce({
      email: "guest@example.com",
      token: "token-a",
      source: "health-check",
    });
    const p2 = captureGuestLeadOnce({
      email: "guest@example.com",
      token: "token-b",
      source: "health-check",
    });

    resolveInvoke({ data: { ok: true }, error: null });
    const [first, second] = await Promise.all([p1, p2]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(markGuestLeadCaptured).toHaveBeenCalledTimes(1);
  });
});
