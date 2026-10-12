import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginModal } from "./LoginModal";

const authMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  resend: vi.fn(),
  track: vi.fn(),
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
      getSession: vi.fn(async () => ({ data: { session: null } })),
      signInWithPassword: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("../../lib/supabaseAuth", () => ({
  signUpWithEmail: (...args: unknown[]) => authMocks.signUp(...args),
}));

vi.mock("../../lib/analytics", () => ({
  getFirstTouchParams: () => ({}),
  track: (...args: unknown[]) => authMocks.track(...args),
}));

function renderModal() {
  return render(
    <MemoryRouter>
      <LoginModal isOpen email={null} guestRef={null} sessionId={null} onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

async function reachConfirmScreen() {
  authMocks.signUp.mockResolvedValue({ status: "confirm_email" });
  renderModal();
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "longpassword" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText("Check your email to confirm.")).toBeTruthy();
  expect(screen.getByText("Can't see it? Check your junk or spam folder.")).toBeTruthy();
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  authMocks.signUp.mockReset();
  authMocks.resend.mockReset();
  authMocks.track.mockReset();
});

describe("LoginModal confirmation resend", () => {
  it("resends with the signup email and redirect, then counts down and confirms", async () => {
    await reachConfirmScreen();
    const emailRedirectTo = authMocks.signUp.mock.calls[0][0].emailRedirectTo as string;
    expect(emailRedirectTo).toBe(
      `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
    );
    expect(authMocks.track).toHaveBeenCalledWith("sign_up", { method: "email" });

    authMocks.resend.mockResolvedValue({ data: {}, error: null });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));
    });

    expect(authMocks.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "ada@example.com",
      options: { emailRedirectTo },
    });
    expect(screen.getByRole("button", { name: "Resend confirmation email (60s)" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole("button", { name: "Resend confirmation email (59s)" })).toBeDisabled();

    for (let i = 0; i < 59; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }

    expect(screen.getByText("Email sent again")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Resend confirmation email/ })).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.queryByText("Email sent again")).toBeNull();
    expect(screen.getByRole("button", { name: "Resend confirmation email" })).toBeEnabled();
  });

  it("shows a resend error and leaves the button available", async () => {
    await reachConfirmScreen();
    authMocks.resend.mockResolvedValue({ data: null, error: { message: "rate limit" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));
    });

    expect(screen.getByText("Couldn't resend. Please try again shortly.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Resend confirmation email" })).toBeEnabled();
  });
});
