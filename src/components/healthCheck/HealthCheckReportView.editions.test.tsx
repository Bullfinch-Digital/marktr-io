import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HealthCheckReportView, getScoreColor } from "../../components/healthCheck/HealthCheckReportView";
import { EditionProvider } from "../../contexts/EditionContext";
import type { Edition } from "../edition";
import {
  HEALTH_CHECK_REPORT_FIXTURE_FINDINGS,
  healthCheckReportFixtureInput,
  healthCheckReportFixtureScores,
} from "../../test/fixtures/healthCheckReport";

const DIMENSIONS = [
  "Website Clarity",
  "Brand Story",
  "Content Consistency",
  "Social Presence",
] as const;

function renderEdition(edition: Edition) {
  return render(
    <EditionProvider edition={edition}>
      <MemoryRouter>
        <HealthCheckReportView
          scores={healthCheckReportFixtureScores}
          input={healthCheckReportFixtureInput}
          showPaywallUpsell={false}
          showDashboardCta={false}
        />
      </MemoryRouter>
    </EditionProvider>,
  );
}

describe("HealthCheckReportView editions", () => {
  it.each(["marktr", "bullfinch"] as const)(
    "renders every fixture dimension and finding for %s",
    (edition) => {
      const { getByText, getAllByText, queryByText, unmount } = renderEdition(edition);

      for (const name of DIMENSIONS) {
        expect(getAllByText(name).length).toBeGreaterThan(0);
      }
      for (const finding of HEALTH_CHECK_REPORT_FIXTURE_FINDINGS) {
        expect(getByText(finding)).toBeTruthy();
      }
      if (edition === "marktr") {
        expect(getByText("Your Digital Health Report")).toBeTruthy();
        expect(queryByText("Your Marketing Health Check")).toBeNull();
      } else {
        expect(getByText("Your Marketing Health Check")).toBeTruthy();
        expect(queryByText("Your Digital Health Report")).toBeNull();
      }

      unmount();
    },
  );

  it("renders the stored Bullfinch route and never recalculates it from scores", () => {
    const { getByRole, getByText, queryByText, unmount } = render(
      <EditionProvider edition="bullfinch">
        <MemoryRouter>
          <HealthCheckReportView
            scores={{
              ...healthCheckReportFixtureScores,
              websiteClarity: { ...healthCheckReportFixtureScores.websiteClarity, score: 18 },
              brandStory: { ...healthCheckReportFixtureScores.brandStory, score: 12 },
              overall: 22,
            }}
            input={healthCheckReportFixtureInput}
            showPaywallUpsell={false}
            showDashboardCta={false}
            bfRoute="talk"
            publicToken="phase3-token"
          />
        </MemoryRouter>
      </EditionProvider>,
    );

    expect(getByText("Your reputation's ahead of your marketing.")).toBeTruthy();
    expect(queryByText("You're at the building stage.")).toBeNull();
    const primary = getByRole("link", { name: "Check availability →" });
    expect(primary.getAttribute("href")).toContain("report=phase3-token");
    expect(primary.getAttribute("href")).toContain("utm_content=talk");
    expect(primary.getAttribute("href")).toContain(
      `website=${encodeURIComponent("https://confires.co.uk")}`,
    );
    unmount();
  });

  it("does not show the Bullfinch next-step on marktr, including when a route is passed", () => {
    const { getByText, queryByText, unmount } = render(
      <EditionProvider edition="marktr">
        <MemoryRouter>
          <HealthCheckReportView
            scores={healthCheckReportFixtureScores}
            input={healthCheckReportFixtureInput}
            showPaywallUpsell
            showDashboardCta={false}
            bfRoute="talk"
            publicToken="should-not-matter"
          />
        </MemoryRouter>
      </EditionProvider>,
    );

    expect(getByText("Ready to turn these scores into a plan?")).toBeTruthy();
    expect(queryByText("Your reputation's ahead of your marketing.")).toBeNull();
    expect(queryByText("You're in good shape.")).toBeNull();
    expect(queryByText("You're at the building stage.")).toBeNull();
    unmount();
  });

  it("hides the Brand Story /story link for bullfinch and keeps it for marktr", () => {
    const scores = {
      ...healthCheckReportFixtureScores,
      brandStory: {
        ...healthCheckReportFixtureScores.brandStory,
        storyAssessment: {
          hasFounderStory: false,
          founderStoryQuality: "none" as const,
          speaksToSpecificCustomer: false,
          hasDistinctivePositioning: false,
          hasEmotionalHook: false,
          missingElements: ["Founder story"],
          storySystemSignpost: { copy: "A distinctive story would lift this score." },
        },
      },
    };

    const marktr = render(
      <EditionProvider edition="marktr">
        <MemoryRouter>
          <HealthCheckReportView
            scores={scores}
            input={healthCheckReportFixtureInput}
            showPaywallUpsell={false}
            showDashboardCta={false}
          />
        </MemoryRouter>
      </EditionProvider>,
    );
    expect(marktr.getByText("Find your brand story →")).toBeTruthy();
    marktr.unmount();

    const bullfinch = render(
      <EditionProvider edition="bullfinch">
        <MemoryRouter>
          <HealthCheckReportView
            scores={scores}
            input={healthCheckReportFixtureInput}
            showPaywallUpsell={false}
            showDashboardCta={false}
          />
        </MemoryRouter>
      </EditionProvider>,
    );
    expect(bullfinch.queryByText("Find your brand story →")).toBeNull();
    expect(bullfinch.getByText("A distinctive story would lift this score.")).toBeTruthy();
    bullfinch.unmount();
  });

  it("keeps marktr score bands at 70/40 and uses 75/50 for bullfinch", () => {
    document.documentElement.dataset.edition = "marktr";
    expect(getScoreColor(70)).toContain("--hc-score-high");
    expect(getScoreColor(69)).toContain("--hc-score-mid");
    expect(getScoreColor(40)).toContain("--hc-score-mid");
    expect(getScoreColor(39)).toContain("--hc-score-low");

    document.documentElement.dataset.edition = "bullfinch";
    expect(getScoreColor(75)).toContain("--hc-score-high");
    expect(getScoreColor(74)).toContain("--hc-score-mid");
    expect(getScoreColor(50)).toContain("--hc-score-mid");
    expect(getScoreColor(49)).toContain("--hc-score-low");
    document.documentElement.dataset.edition = "marktr";
  });
});
