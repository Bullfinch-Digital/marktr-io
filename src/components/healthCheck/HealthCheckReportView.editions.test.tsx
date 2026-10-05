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
    const { getAllByRole, getByText, queryByText, unmount } = render(
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
    const primary = getAllByRole("link", { name: "Check availability →" })[0];
    expect(primary.getAttribute("href")).toContain("report=phase3-token");
    expect(primary.getAttribute("href")).toContain("utm_content=talk");
    expect(primary.getAttribute("href")).toContain(
      `website=${encodeURIComponent("https://confires.co.uk")}`,
    );
    expect(getByText("Send me my score")).toBeTruthy();
    expect(getByText("Also send me occasional marketing tips")).toBeTruthy();
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
    expect(queryByText("Send me my score")).toBeNull();
    unmount();
  });

  it("shows Not checked for Bullfinch when no social handles were entered, and keeps marktr scores", () => {
    const scores = {
      ...healthCheckReportFixtureScores,
      overall: 60,
      socialPresence: { ...healthCheckReportFixtureScores.socialPresence, score: 0, scoreRaw: 0 },
      contentConsistency: {
        ...healthCheckReportFixtureScores.contentConsistency,
        score: 0,
        scoreRaw: 0,
      },
    };
    const input = {
      ...healthCheckReportFixtureInput,
      instagramHandle: "",
      facebookUrl: "",
    };

    const bullfinch = render(
      <EditionProvider edition="bullfinch">
        <MemoryRouter>
          <HealthCheckReportView
            scores={scores}
            input={input}
            showPaywallUpsell={false}
            showDashboardCta={false}
          />
        </MemoryRouter>
      </EditionProvider>,
    );
    expect(bullfinch.getAllByText("Not checked").length).toBeGreaterThanOrEqual(2);
    expect(bullfinch.getAllByText("Add your Instagram for a full score").length).toBeGreaterThan(0);
    expect(
      bullfinch.getByText("Based on your website and story. Add your Instagram for a full score."),
    ).toBeTruthy();
    expect(bullfinch.queryByText(HEALTH_CHECK_REPORT_FIXTURE_FINDINGS[2])).toBeNull();
    expect(bullfinch.queryByText(HEALTH_CHECK_REPORT_FIXTURE_FINDINGS[3])).toBeNull();
    bullfinch.unmount();

    const marktr = render(
      <EditionProvider edition="marktr">
        <MemoryRouter>
          <HealthCheckReportView
            scores={scores}
            input={input}
            showPaywallUpsell={false}
            showDashboardCta={false}
          />
        </MemoryRouter>
      </EditionProvider>,
    );
    expect(marktr.queryByText("Not checked")).toBeNull();
    expect(marktr.getAllByText("0").length).toBeGreaterThan(0);
    expect(marktr.getByText(HEALTH_CHECK_REPORT_FIXTURE_FINDINGS[3])).toBeTruthy();
    marktr.unmount();
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

  it("swaps the cap line and spotlights unchecked social when scores are strong", () => {
    const story = "The about page says the park has been family-run in Shropshire since 1974.";
    const storyStep = "Use that line on the gallery page as well.";
    const oldCap =
      "Your scores are genuinely strong across the board — we cap the automated overall at 92 because the last few points are the kind of thing that benefits from a human eye, not a scraper.";
    const scores = {
      ...healthCheckReportFixtureScores,
      overall: 92,
      overallRaw: 95,
      capped: true,
      overallSummary: oldCap,
      websiteClarity: {
        ...healthCheckReportFixtureScores.websiteClarity,
        score: 90,
        scoreRaw: 90,
        observation: "The homepage names touring pitches and who they are for.",
        nextStep: "Move the booking button to the top of the homepage.",
      },
      brandStory: {
        ...healthCheckReportFixtureScores.brandStory,
        score: 95,
        scoreRaw: 100,
        dimensionCapped: true,
        observation: story,
        nextStep: storyStep,
      },
      contentConsistency: {
        ...healthCheckReportFixtureScores.contentConsistency,
        score: 0,
        scoreRaw: 0,
        observation: "No Instagram or Facebook was entered, so we couldn't check this.",
      },
      socialPresence: {
        ...healthCheckReportFixtureScores.socialPresence,
        score: 0,
        scoreRaw: 0,
        observation: "No Instagram or Facebook was entered, so we couldn't check this.",
      },
    };
    const input = {
      ...healthCheckReportFixtureInput,
      websiteUrl: "https://greencaravanpark.co.uk",
      businessName: "Green Caravan Park",
      instagramHandle: "",
      facebookUrl: "",
      websiteScore: {
        score: 90,
        observation: "The homepage names touring pitches and who they are for.",
        findings: [
          {
            dimension: "Website Clarity",
            score: 90,
            finding: "The homepage names touring pitches and who they are for.",
            nextStep: "Move the booking button to the top of the homepage.",
          },
          {
            dimension: "Brand Story",
            score: 95,
            finding: story,
            nextStep: storyStep,
          },
        ],
      },
    };

    const bullfinch = render(
      <EditionProvider edition="bullfinch">
        <MemoryRouter>
          <HealthCheckReportView
            scores={scores}
            input={input}
            showPaywallUpsell={false}
            showDashboardCta={false}
            bfRoute="talk"
            publicToken="green-token"
          />
        </MemoryRouter>
      </EditionProvider>,
    );
    expect(
      bullfinch.getByText(
        "Your website and story are in great shape. The part we couldn't see is your social — and for businesses like yours, that's usually where the gap is.",
      ),
    ).toBeTruthy();
    expect(bullfinch.queryByText(oldCap)).toBeNull();
    expect(bullfinch.queryByText(/hold the top back/)).toBeNull();
    expect(bullfinch.queryByText(/primary CTA/i)).toBeNull();
    expect(bullfinch.getByText(story)).toBeTruthy();
    expect(bullfinch.getByText(storyStep)).toBeTruthy();
    expect(bullfinch.getByText("Your social presence")).toBeTruthy();
    expect(
      bullfinch.getByText(
        "We couldn't check your Instagram this time. It's usually the first thing we look at with a business like yours — whether it tells the same story as your website, and whether there's a system keeping it going.",
      ),
    ).toBeTruthy();
    expect(bullfinch.getByText(/That's the kind of thing we'd map out together/)).toBeTruthy();
    const again = bullfinch.getByRole("link", { name: "Add your Instagram and re-run the check →" });
    expect(again.getAttribute("href")).toContain("website=https%3A%2F%2Fgreencaravanpark.co.uk");
    expect(again.getAttribute("href")).toContain("business=Green+Caravan+Park");
    bullfinch.unmount();

    const marktr = render(
      <EditionProvider edition="marktr">
        <MemoryRouter>
          <HealthCheckReportView
            scores={scores}
            input={input}
            showPaywallUpsell={false}
            showDashboardCta={false}
          />
        </MemoryRouter>
      </EditionProvider>,
    );
    expect(
      marktr.getByText(
        "Your website and story are in great shape. The part we couldn't see is your social, and that's often where the gap is.",
      ),
    ).toBeTruthy();
    expect(marktr.queryByText(oldCap)).toBeNull();
    expect(marktr.queryByText("Your social presence")).toBeNull();
    expect(marktr.getByText(story)).toBeTruthy();
    marktr.unmount();
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
