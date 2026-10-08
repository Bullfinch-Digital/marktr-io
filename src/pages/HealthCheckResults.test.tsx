import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EditionProvider } from "../contexts/EditionContext";
import {
  healthCheckReportFixtureInput,
  healthCheckReportFixtureScores,
} from "../test/fixtures/healthCheckReport";

const { persistHealthCheckForActiveBrand, track, brandState } = vi.hoisted(() => ({
  persistHealthCheckForActiveBrand: vi.fn(),
  track: vi.fn(),
  brandState: {
    brands: [{ id: "brand-apostle", name: "Apostle Coffee" }],
  },
}));

vi.mock("../lib/healthCheckPersistence", async () => {
  const actual = await vi.importActual<typeof import("../lib/healthCheckPersistence")>(
    "../lib/healthCheckPersistence",
  );
  return {
    ...actual,
    persistHealthCheckForActiveBrand: (...args: unknown[]) =>
      persistHealthCheckForActiveBrand(...args),
  };
});

vi.mock("../lib/analytics", async () => {
  const actual = await vi.importActual<typeof import("../lib/analytics")>("../lib/analytics");
  return {
    ...actual,
    track: (...args: unknown[]) => track(...args),
  };
});

vi.mock("../lib/guestHealthCheck", () => ({
  setGuestHealthCheck: vi.fn(),
}));

vi.mock("../lib/guestContext", () => ({
  getGuestIdentityEmail: () => "jon@example.com",
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-jon", email: "jon@example.com", is_anonymous: false },
    session: null,
    loading: false,
  }),
}));

vi.mock("../contexts/BrandContext", () => ({
  useBrand: () => ({
    activeBrandId: "brand-apostle",
    brands: brandState.brands,
    loading: false,
    activeBrand: brandState.brands[0],
    setActiveBrand: vi.fn(),
  }),
}));

vi.mock("../hooks/useSubscription", () => ({
  default: () => ({ isPro: true, loading: false }),
}));

vi.mock("../hooks/useProfile", () => ({
  default: () => ({
    profile: { subscription_tier: "pro" },
    loading: false,
  }),
}));

vi.mock("../lib/healthCheckScoring", async () => {
  const actual = await vi.importActual<typeof import("../lib/healthCheckScoring")>(
    "../lib/healthCheckScoring",
  );
  return {
    ...actual,
    calculateScores: () => healthCheckReportFixtureScores,
  };
});

import HealthCheckResults from "./HealthCheckResults";

const locationState = {
  ...healthCheckReportFixtureInput,
  email: "jon@example.com",
};

function renderResults() {
  return render(
    <EditionProvider edition="marktr">
      <MemoryRouter
        initialEntries={[{ pathname: "/health-check/results", state: locationState }]}
      >
        <Routes>
          <Route path="/health-check/results" element={<HealthCheckResults />} />
          <Route path="/health-check" element={<div>start</div>} />
        </Routes>
      </MemoryRouter>
    </EditionProvider>,
  );
}

afterEach(() => {
  cleanup();
  persistHealthCheckForActiveBrand.mockReset();
  track.mockReset();
});

describe("HealthCheckResults dashboard save notice", () => {
  beforeEach(() => {
    persistHealthCheckForActiveBrand.mockResolvedValue({
      ok: true,
      alreadySaved: false,
      row: { id: "row-1" },
    });
  });

  it("does not show a save notice on a successful persist", async () => {
    renderResults();
    await waitFor(() => {
      expect(persistHealthCheckForActiveBrand).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByText("We couldn't save these results to your dashboard. Try again."),
    ).toBeNull();
    expect(track).not.toHaveBeenCalledWith(
      "health_check_save_failed",
      expect.anything(),
    );
  });

  it("shows a retry notice when persist fails, then clears it after a successful retry", async () => {
    persistHealthCheckForActiveBrand
      .mockResolvedValueOnce({ ok: false, reason: "insert_error" })
      .mockResolvedValueOnce({
        ok: true,
        alreadySaved: true,
        row: { id: "row-1" },
      });

    renderResults();

    await waitFor(() => {
      expect(
        screen.getByText("We couldn't save these results to your dashboard. Try again."),
      ).toBeTruthy();
    });
    expect(screen.getByRole("heading", { name: /here's how your marketing scores today/i })).toBeTruthy();
    expect(track).toHaveBeenCalledWith("health_check_save_failed", {
      reason: "insert_error",
    });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(
        screen.queryByText("We couldn't save these results to your dashboard. Try again."),
      ).toBeNull();
    });
    expect(persistHealthCheckForActiveBrand).toHaveBeenCalledTimes(2);
  });
});
