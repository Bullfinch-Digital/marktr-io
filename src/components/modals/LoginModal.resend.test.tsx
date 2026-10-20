import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginModal } from "./LoginModal";

const authMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  resend: vi.fn(),
  verifyOtp: vi.fn(),
  signInWithPassword: vi.fn(),
  trackSignUpOnce: vi.fn(),
  trackLoginOnce: vi.fn(),
  onClose: vi.fn(),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
  }),
}));

vi.mock("../../config/supabase", () => ({
  supabase: {
    auth: {
      resend: (...args: unknown[]) => authMocks.resend(...args),
      verifyOtp: (...args: unknown[]) => authMocks.verifyOtp(...args),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      signInWithPassword: (...args: unknown[]) => authMocks.signInWithPassword(...args),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("../../lib/supabaseAuth", () => ({
  signUpWithEmail: (...args: unknown[]) => authMocks.signUp(...args),
}));

vi.mock("../../lib/analytics", () => ({
  getFirstTouchParams: () => ({}),
  trackSignUpOnce: (...args: unknown[]) => authMocks.trackSignUpOnce(...args),
  trackLoginOnce: (...args: unknown[]) => authMocks.trackLoginOnce(...args),
}));

function renderModal(initialMode: "signin" | "signup" = "signup") {
  return render(
    <MemoryRouter>
      <LoginModal
        isOpen
        email={null}
        guestRef={null}
        sessionId={null}
        onClose={authMocks.onClose}
        initialMode={initialMode}
      />
    </MemoryRouter>,
  );
}

async function reachCodeStep() {
  authMocks.signUp.mockResolvedValue({ status: "confirm_email" });
  renderModal();
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "longpassword" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByRole("heading", { name: "Check your email" })).toBeTruthy();
  expect(screen.getByText(/We sent a 6-digit code to/)).toBeTruthy();
  expect(screen.getByText("ada@example.com")).toBeTruthy();
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  authMocks.signUp.mockReset();
  authMocks.resend.mockReset();
  authMocks.verifyOtp.mockReset();
  authMocks.signInWithPassword.mockReset();
  authMocks.trackSignUpOnce.mockReset();
  authMocks.trackLoginOnce.mockReset();
  authMocks.onClose.mockReset();
});

describe("LoginModal email code", () => {
  it("asks for a code in the same modal and does not put trial params on the redirect", async () => {
    await reachCodeStep();
    const emailRedirectTo = authMocks.signUp.mock.calls[0][0].emailRedirectTo as string;
    expect(emailRedirectTo).toBe(
      `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
    );
    expect(emailRedirectTo).not.toContain("intent=");
    expect(emailRedirectTo).not.toContain("plan=");
    expect(authMocks.trackSignUpOnce).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Resend code (30s)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Verify" }).getAttribute("data-track-id")).toBe(
      "auth_verify_code",
    );
    expect(screen.getByRole("button", { name: "Verify" }).getAttribute("data-track-location")).toBe(
      "auth_modal",
    );
  });

  it("verifies six digits, tracks sign_up, and closes without navigating", async () => {
    await reachCodeStep();
    authMocks.verifyOtp.mockResolvedValue({
      data: { user: { id: "user-1234567890" }, session: { user: { id: "user-1234567890" } } },
      error: null,
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Code"), { target: { value: "12ab3456" } });
    });

    expect(authMocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(authMocks.verifyOtp).toHaveBeenCalledWith({
      email: "ada@example.com",
      token: "123456",
      type: "signup",
    });
    expect(authMocks.trackSignUpOnce).toHaveBeenCalledWith("user-1234567890", "email");
    expect(authMocks.onClose).toHaveBeenCalled();
  });

  it("submits the code form on enter and ignores a second submit while verifying", async () => {
    await reachCodeStep();
    let resolveVerify: (value: unknown) => void = () => {};
    authMocks.verifyOtp.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve;
        }),
    );
    const input = screen.getByLabelText("Code");
    fireEvent.change(input, { target: { value: "12345" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText("Enter the 6-digit code from the email.")).toBeTruthy();

    fireEvent.change(input, { target: { value: "654321" } });
    fireEvent.submit(input.closest("form")!);
    expect(authMocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Verifying..." })).toBeDisabled();

    await act(async () => {
      resolveVerify({ data: {}, error: { message: "Token has expired or is invalid" } });
    });
    expect(
      screen.getByText("That code doesn't match or has expired. Try again, or request a new one."),
    ).toBeTruthy();
  });

  it("resends with type signup after the cooldown", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    authMocks.signUp.mockResolvedValue({ status: "confirm_email" });
    authMocks.resend.mockResolvedValue({ data: {}, error: null });
    renderModal();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "longpassword" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole("heading", { name: "Check your email" })).toBeTruthy();

    for (let i = 0; i < 30; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }

    const resend = screen.getByRole("button", { name: "Resend code" });
    expect(resend).toBeEnabled();
    expect(resend.getAttribute("data-track-id")).toBe("auth_resend_code");
    expect(resend.getAttribute("data-track-location")).toBe("auth_modal");

    await act(async () => {
      fireEvent.click(resend);
    });

    expect(authMocks.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "ada@example.com",
    });
    expect(screen.getByRole("button", { name: "Resend code (30s)" })).toBeDisabled();
  });

  it("keeps the email when choosing a different address", async () => {
    await reachCodeStep();
    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeTruthy();
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("ada@example.com");
  });

  it("resends a code when an unconfirmed account tries to sign in", async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Email not confirmed", code: "email_not_confirmed" },
    });
    authMocks.resend.mockResolvedValue({ data: {}, error: null });
    renderModal("signin");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "longpassword" } });
    fireEvent.submit(screen.getByLabelText("Password").closest("form")!);

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeTruthy();
    expect(authMocks.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "ada@example.com",
    });
    expect(screen.queryByText("Email not confirmed")).toBeNull();
  });
});
