import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HealthCheckReportView } from "../../components/healthCheck/HealthCheckReportView";
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
      const { getByText, getAllByText, unmount } = renderEdition(edition);

      for (const name of DIMENSIONS) {
        expect(getAllByText(name).length).toBeGreaterThan(0);
      }
      for (const finding of HEALTH_CHECK_REPORT_FIXTURE_FINDINGS) {
        expect(getByText(finding)).toBeTruthy();
      }

      unmount();
    },
  );

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
});
