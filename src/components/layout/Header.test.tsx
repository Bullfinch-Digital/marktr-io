import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "./Header";

const authState = vi.hoisted(() => ({
  loggedIn: false,
  signOut: vi.fn(),
  openLogin: vi.fn(),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authState.loggedIn
      ? { id: "user-1", email: "jon@example.com", is_anonymous: false }
      : null,
    session: null,
    loading: false,
    signOut: authState.signOut,
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}));

vi.mock("../../contexts/AuthModalContext", () => ({
  useAuthModal: () => ({
    openLogin: authState.openLogin,
    openFinishAccount: vi.fn(),
    openSignIn: vi.fn(),
    closeAuthModal: vi.fn(),
  }),
}));

const NAV_LABELS = [
  "Check your digital health",
  "Find your story",
  "Know your customer",
  "Pricing",
  "Resources",
  "Downloads",
];

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

describe("Header public nav", () => {
  it("shows marketing links plus login when logged out", () => {
    authState.loggedIn = false;
    renderHeader();
    for (const label of NAV_LABELS) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("button", { name: "Login" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Get started - Free" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Resources" }).getAttribute("data-track-id"),
    ).toBe("header_nav_resources");
    expect(
      screen.getByRole("link", { name: "Resources" }).getAttribute("data-track-location"),
    ).toBe("header");
  });

  it("keeps marketing links when logged in and only swaps the auth actions", () => {
    authState.loggedIn = true;
    renderHeader();
    for (const label of NAV_LABELS) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByRole("link", { name: "Dashboard" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Sign Out" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Login" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Get started - Free" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Pricing" }).getAttribute("data-track-id"),
    ).toBe("header_nav_pricing");
  });

  it("opens the mobile menu with the same links while logged in", () => {
    authState.loggedIn = true;
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    expect(screen.getAllByRole("link", { name: "Resources" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Downloads" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Dashboard" }).length).toBeGreaterThan(0);
  });
});
