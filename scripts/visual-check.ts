/**
 * Visual regression proof for the Bullfinch edition work.
 *
 * Serves the baseline ref (in a throwaway git worktree) and the current tree on
 * two ports, walks every Health Check step at desktop and mobile widths on both,
 * and diffs the pairs with pixelmatch. Also captures the Bullfinch steps, which
 * only exist on the current tree.
 *
 * No network call reaches Supabase, Cloudflare or OpenAI: score-website,
 * get-health-check-report, capture-onboarding-lead, capture-report-lead and auth
 * are all fulfilled from fixtures, and Turnstile is replaced by a stub widget.
 *
 *   npm run visual-check
 *   BASELINE_REF=origin/app-full-dev-070526 npm run visual-check
 */
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page, type Route } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const ROOT = process.cwd();
const BASELINE_REF = process.env.BASELINE_REF ?? "origin/app-full-dev-070526";
const WORKTREE = process.env.VISUAL_WORKTREE ?? "/tmp/marktr-visual-baseline";
const OUT = path.join(ROOT, "docs/phase2-proof");
const BASELINE_PORT = Number(process.env.BASELINE_PORT ?? 5190);
const BRANCH_PORT = Number(process.env.BRANCH_PORT ?? 5191);

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

type Viewport = (typeof VIEWPORTS)[number];

/** Steps compared between baseline and branch. Must stay identical on marktr. */
const MARKTR_STEPS = ["welcome", "inputs", "scanning", "results"] as const;
type MarktrStep = (typeof MARKTR_STEPS)[number];

// ---------------------------------------------------------------- fixtures

const FACTS = {
  valueProp: "vague",
  namesCustomer: "hinted",
  usesSecondPerson: true,
  primaryCTA: "competing",
  proofOnPage: "claimed",
  pathToBuyContact: "clear",
  founderStory: "partial",
  storySpecific: "mixed",
  storyNamesConcrete: false,
  pointOfView: "implied",
  valuesMission: "generic",
  socialReflectsStory: "loose",
  igProfileComplete: "thin",
  bioOnMessage: "thin",
};

const APIFY_METRICS = {
  instagramFound: true,
  facebookFound: false,
  instagramFetchStatus: "found",
  followers: 2400,
  avgLikes: 85,
  avgComments: 6,
  latestPostDaysAgo: 4,
  postsPerWeek: 2.5,
  bioLength: 120,
  hasExternalUrl: true,
  hasFullName: true,
};

const FINDINGS = [
  {
    dimension: "Website Clarity",
    score: 58,
    finding:
      "Your homepage hints at who it is for without naming them, so visitors have to work out whether it applies to them.",
  },
  {
    dimension: "Brand Story",
    score: 46,
    finding:
      "There is a founder story, but it stays general — no concrete moment or named customer to anchor it.",
  },
  {
    dimension: "Content Consistency",
    score: 52,
    finding: "You post roughly twice a week, but the bio does not carry the same message as the site.",
  },
  {
    dimension: "Social Presence",
    score: 40,
    finding: "The Instagram profile is thin and Facebook was not found.",
  },
];

const PUBLIC_TOKEN = "visualcheckfixturetoken0000000000000000000";
const POLISH_TOKEN = "visualcheckpolishfixturetoken000000000000";
const DIY_TOKEN = "visualcheckdiyfixturetoken000000000000000";

const SCORE_WEBSITE_RESPONSE = {
  facts: FACTS,
  apifyMetrics: APIFY_METRICS,
  modelVersion: "gpt-4o-mini-2024-07-18",
  scrapeOk: true,
  observation: "Analysis complete",
  strengths: ["Clear contact route on every page", "Consistent product photography"],
  gaps: ["Headline does not name the customer", "Two competing calls to action in the hero"],
  findings: FINDINGS,
  overallSummary: undefined as string | undefined,
  report: { publicToken: PUBLIC_TOKEN },
};

function dimension(name: string, score: number, observation: string) {
  return {
    name,
    score,
    scoreRaw: score,
    dimensionCapped: false,
    unmeasured: false,
    observation,
  };
}

type BfVisualRoute = "talk" | "polish" | "diy";

function buildReportRow(opts: {
  token: string;
  route: BfVisualRoute;
  overall: number;
  website: number;
  story: number;
  content: number;
  social: number;
  instagramHandle?: string;
  facebookUrl?: string;
}) {
  return {
    public_token: opts.token,
    edition: "bullfinch",
    url: "https://apostlecoffee.co.uk",
    overall: opts.overall,
    capped: false,
    website_score: opts.website,
    brand_story_score: opts.story,
    content_score: opts.content,
    social_score: opts.social,
    findings: FINDINGS,
    bf_route: opts.route,
    scoring_version: "1.0.3",
    created_at: "2026-09-30T12:00:00.000Z",
    scores: {
      websiteClarity: {
        ...dimension("Website Clarity", opts.website, FINDINGS[0].finding),
        strengths: SCORE_WEBSITE_RESPONSE.strengths,
        gaps: SCORE_WEBSITE_RESPONSE.gaps,
      },
      brandStory: dimension("Brand Story", opts.story, FINDINGS[1].finding),
      contentConsistency: dimension("Content Consistency", opts.content, FINDINGS[2].finding),
      socialPresence: dimension("Social Presence", opts.social, FINDINGS[3].finding),
      overall: opts.overall,
      overallRaw: opts.overall,
      capped: false,
      lowestDimension: "Social Presence",
      lowestScore: opts.social,
      inputs: {
        websiteUrl: "https://apostlecoffee.co.uk",
        instagramHandle: opts.instagramHandle ?? "apostlecoffee",
        facebookUrl: opts.facebookUrl ?? "",
        domain: "apostlecoffee.co.uk",
      },
      websiteScore: {
        score: opts.website,
        observation: "Analysis complete",
        strengths: SCORE_WEBSITE_RESPONSE.strengths,
        gaps: SCORE_WEBSITE_RESPONSE.gaps,
        findings: FINDINGS,
      },
    },
  };
}

const REPORT_TALK = buildReportRow({
  token: PUBLIC_TOKEN,
  route: "talk",
  overall: 60,
  website: 95,
  story: 95,
  content: 0,
  social: 0,
  instagramHandle: "",
  facebookUrl: "",
});
const REPORT_POLISH = buildReportRow({
  token: POLISH_TOKEN,
  route: "polish",
  overall: 81,
  website: 88,
  story: 80,
  content: 72,
  social: 70,
});
const REPORT_DIY = buildReportRow({
  token: DIY_TOKEN,
  route: "diy",
  overall: 22,
  website: 18,
  story: 12,
  content: 0,
  social: 0,
});

const REPORTS_BY_TOKEN: Record<string, ReturnType<typeof buildReportRow>> = {
  [PUBLIC_TOKEN]: REPORT_TALK,
  [POLISH_TOKEN]: REPORT_POLISH,
  [DIY_TOKEN]: REPORT_DIY,
};

const ROUTE_PROOF: Record<
  BfVisualRoute,
  { token: string; heading: string; primary: string; hrefIncludes: string[] }
> = {
  talk: {
    token: PUBLIC_TOKEN,
    heading: "Your reputation's ahead of your marketing.",
    primary: "Check availability →",
    hrefIncludes: [
      `website=${encodeURIComponent("https://apostlecoffee.co.uk")}`,
      `report=${PUBLIC_TOKEN}`,
      "utm_content=talk",
    ],
  },
  polish: {
    token: POLISH_TOKEN,
    heading: "You're in good shape.",
    primary: "Get in touch →",
    hrefIncludes: [
      `website=${encodeURIComponent("https://apostlecoffee.co.uk")}`,
      `report=${POLISH_TOKEN}`,
      "utm_content=polish",
    ],
  },
  diy: {
    token: DIY_TOKEN,
    heading: "You're at the building stage.",
    primary: "Start free on marktr.io →",
    hrefIncludes: [
      "https://marktr.io/?utm_source=bullfinch&utm_medium=healthcheck&utm_campaign=bf-healthcheck&utm_content=diy",
    ],
  },
};

// ---------------------------------------------------------------- harness

function run(cmd: string, args: string[], cwd = ROOT) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8" }).trim();
}

function prepareWorktree() {
  if (existsSync(WORKTREE)) {
    try {
      run("git", ["worktree", "remove", "--force", WORKTREE]);
    } catch {
      rmSync(WORKTREE, { recursive: true, force: true });
    }
  }
  run("git", ["worktree", "add", "--detach", WORKTREE, BASELINE_REF]);
  // Share installed deps and local env so both servers are byte-identical apart
  // from the application source itself.
  for (const shared of ["node_modules", ".env.local"]) {
    const target = path.join(ROOT, shared);
    if (existsSync(target)) symlinkSync(target, path.join(WORKTREE, shared));
  }
  console.log(`baseline worktree: ${WORKTREE} @ ${run("git", ["rev-parse", "--short", "HEAD"], WORKTREE)}`);
}

async function startServer(cwd: string, port: number): Promise<ChildProcess> {
  const child = spawn("npx", ["vite", "--port", String(port), "--strictPort", "--host", "127.0.0.1"], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`vite on ${port} did not start`)), 60_000);
    const onData = (buf: Buffer) => {
      if (buf.toString().includes(`:${port}`)) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", (code) => reject(new Error(`vite on ${port} exited with ${code}`)));
  });

  return child;
}

/**
 * Freezes everything that would otherwise differ between two runs of the same
 * page: animations, the rotating analysis line, the progress dots and carets.
 */
const FREEZE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  p.max-w-xs, span.h-2.w-2 { visibility: hidden !important; }
`;

type PageStubs = { leadCaptureCalls: number };

async function preparePage(
  page: Page,
  opts: { scanDelayMs?: number; showCookieBanner?: boolean } = {},
): Promise<PageStubs> {
  const stubs: PageStubs = { leadCaptureCalls: 0 };
  const showCookieBanner = opts.showCookieBanner === true;
  await page.addInitScript(
    ({ showBanner }: { showBanner: boolean }) => {
      if (!showBanner) {
        localStorage.setItem(
          "marktr_cookie_consent_v1",
          JSON.stringify({ essential: true, analytics: false, updatedAt: "2026-09-30T12:00:00.000Z" }),
        );
      } else {
        localStorage.removeItem("marktr_cookie_consent_v1");
      }

    // Stubbed Turnstile: fixed-size widget that hands back a token immediately,
    // so ScanTurnstile and IdentityCapture never fetch Cloudflare's script.
    let seq = 0;
    const callbacks = new Map<string, (token: string) => void>();
    (window as unknown as { turnstile: unknown }).turnstile = {
      render(el: HTMLElement, opts: { callback?: (token: string) => void }) {
        const id = `stub-${(seq += 1)}`;
        if (el.dataset.compact === "true") {
          if (opts?.callback) {
            callbacks.set(id, opts.callback);
            setTimeout(() => opts.callback?.(`stub-token-${id}`), 0);
          }
          return id;
        }
        const box = document.createElement("div");
        box.textContent = "Turnstile (stubbed)";
        box.setAttribute(
          "style",
          "width:300px;height:65px;border:1px solid #888;display:flex;align-items:center;justify-content:center;font:12px system-ui;color:#555;background:#fafafa;box-sizing:border-box;",
        );
        el.appendChild(box);
        if (opts?.callback) {
          callbacks.set(id, opts.callback);
          setTimeout(() => opts.callback?.(`stub-token-${id}`), 0);
        }
        return id;
      },
      reset(id: string) {
        setTimeout(() => callbacks.get(id)?.(`stub-token-${id}-reset`), 0);
      },
      remove(id: string) {
        callbacks.delete(id);
      },
    };
    },
    { showBanner: showCookieBanner },
  );

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(body),
    });

  await page.route("**/functions/v1/score-website", async (route) => {
    if (opts.scanDelayMs) await new Promise((r) => setTimeout(r, opts.scanDelayMs));
    await json(route, SCORE_WEBSITE_RESPONSE);
  });
  await page.route("**/functions/v1/get-health-check-report", async (route) => {
    let token = PUBLIC_TOKEN;
    try {
      const body = route.request().postDataJSON() as { publicToken?: string } | null;
      if (typeof body?.publicToken === "string" && body.publicToken.trim()) {
        token = body.publicToken.trim();
      }
    } catch {
      /* keep default talk fixture */
    }
    await json(route, { report: REPORTS_BY_TOKEN[token] ?? REPORT_TALK });
  });
  await page.route("**/functions/v1/capture-onboarding-lead", (route) => {
    stubs.leadCaptureCalls += 1;
    return json(route, { ok: true });
  });
  await page.route("**/functions/v1/capture-report-lead", (route) => json(route, { ok: true }));
  await page.route("**/auth/v1/**", (route) => json(route, { session: null, user: null }));
  await page.route("**challenges.cloudflare.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
  );

  return stubs;
}

async function settle(page: Page) {
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForTimeout(250);
}

async function shoot(page: Page, file: string) {
  mkdirSync(path.dirname(file), { recursive: true });
  await settle(page);
  await page.screenshot({ path: file, fullPage: true });
}

// ---------------------------------------------------------------- flows

async function assertAcceptButtonReadable(page: Page) {
  const btn = page.getByRole("button", { name: "Accept all cookies" });
  const { color, backgroundColor } = await btn.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, backgroundColor: s.backgroundColor };
  });
  if (color === backgroundColor) {
    throw new Error(`Accept cookies button has identical text and background: ${color}`);
  }
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = (css: string) => {
    const [r, g, b] = (css.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const L1 = Math.max(lum(color), lum(backgroundColor));
  const L2 = Math.min(lum(color), lum(backgroundColor));
  const ratio = (L1 + 0.05) / (L2 + 0.05);
  if (ratio < 4.5) {
    throw new Error(
      `Accept cookies button contrast ${ratio.toFixed(2)}:1 (${color} on ${backgroundColor}) is under 4.5:1`,
    );
  }
}

async function fillInputs(page: Page, withIdentity: boolean) {
  await page.getByLabel("Website URL").fill("https://apostlecoffee.co.uk");
  await page.getByLabel("Instagram handle").fill("apostlecoffee");
  if (withIdentity) {
    await page.getByLabel("What should we call you?").fill("Jon");
    await page.getByLabel("Where should we send your results?").fill("visual-check@example.com");
    // marktr gates the scan on the legal checkbox; unticked opens a modal instead.
    const legal = page.getByRole("checkbox");
    if ((await legal.count()) > 0 && !(await legal.first().isChecked())) {
      await legal.first().check();
    }
  }
}

async function captureMarktr(
  baseUrl: string,
  browser: Browser,
  viewport: Viewport,
  dir: string,
): Promise<void> {
  // Pass 1: welcome → inputs → scanning, with the scan held open.
  {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await preparePage(page, { scanDelayMs: 30_000 });

    await page.goto(`${baseUrl}/health-check`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /check your digital health/i }).waitFor();
    await shoot(page, path.join(dir, `welcome-${viewport.name}.png`));

    await page.getByRole("button", { name: /start my digital health check/i }).click();
    await page.getByRole("heading", { name: /where can we find you online/i }).waitFor();
    await fillInputs(page, true);
    await shoot(page, path.join(dir, `inputs-${viewport.name}.png`));

    await page.getByRole("button", { name: /analyse my presence/i }).click();
    await page.getByRole("heading", { name: /checking your presence/i }).waitFor();
    await page.waitForTimeout(2_500); // checklist finishes; rotating copy is hidden
    await shoot(page, path.join(dir, `scanning-${viewport.name}.png`));
    await context.close();
  }

  // Pass 2: straight through to the results page.
  {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await preparePage(page);

    await page.goto(`${baseUrl}/health-check`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /start my digital health check/i }).click();
    await fillInputs(page, true);
    await page.getByRole("button", { name: /analyse my presence/i }).click();
    await page.getByRole("heading", { name: /how your marketing scores today/i }).waitFor({
      timeout: 30_000,
    });
    if ((await page.getByRole("heading", { name: "Send me my score" }).count()) > 0) {
      throw new Error("marktr results rendered the Bullfinch send-score card");
    }
    await shoot(page, path.join(dir, `results-${viewport.name}.png`));
    await context.close();
  }
}

async function captureBullfinch(
  baseUrl: string,
  browser: Browser,
  viewport: Viewport,
  dir: string,
): Promise<void> {
  const q = "?edition=bullfinch";

  {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await preparePage(page, { showCookieBanner: true });

    await page.goto(`${baseUrl}/${q}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /is your marketing as good as your business/i }).waitFor();
    await page.getByRole("dialog", { name: /cookies on bullfinch digital/i }).waitFor();
    await assertAcceptButtonReadable(page);
    await shoot(page, path.join(dir, `cookies-visible-${viewport.name}.png`));

    await page.getByRole("button", { name: "Accept all cookies" }).click();
    await page.getByRole("dialog", { name: /cookies on bullfinch digital/i }).waitFor({
      state: "detached",
    });
    await shoot(page, path.join(dir, `cookies-dismissed-${viewport.name}.png`));
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const stubs = await preparePage(page, { scanDelayMs: 30_000 });

    await page.goto(`${baseUrl}/${q}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /is your marketing as good as your business/i }).waitFor();
    const welcomeTitle = await page.title();
    if (welcomeTitle !== "Free Marketing Health Check | Bullfinch Digital") {
      throw new Error(`Bullfinch welcome title was "${welcomeTitle}"`);
    }
    await shoot(page, path.join(dir, `welcome-${viewport.name}.png`));

    await page.getByRole("button", { name: /get my free score/i }).click();
    await page.getByRole("heading", { name: /where can we find you online/i }).waitFor();
    await fillInputs(page, false);

    const identityFields = await page
      .getByLabel(/what should we call you|where should we send your results/i)
      .count();
    if (identityFields > 0) {
      throw new Error(`Bullfinch inputs step still renders ${identityFields} identity field(s)`);
    }
    const igPlaceholder = await page.getByLabel("Instagram handle").getAttribute("placeholder");
    if (!igPlaceholder?.includes("yourbusiness (or @yourbusiness)")) {
      throw new Error(`Bullfinch Instagram placeholder was "${igPlaceholder}"`);
    }
    if (igPlaceholder?.includes("marktr.io")) {
      throw new Error(`Bullfinch Instagram placeholder still mentions marktr.io: "${igPlaceholder}"`);
    }
    await shoot(page, path.join(dir, `inputs-${viewport.name}.png`));

    await page.getByRole("button", { name: /analyse my presence/i }).click();
    await page.getByRole("heading", { name: /checking your presence/i }).waitFor();
    await page.waitForTimeout(2_500);
    await shoot(page, path.join(dir, `scanning-${viewport.name}.png`));

    if (stubs.leadCaptureCalls > 0) {
      throw new Error(
        `Bullfinch scan called capture-onboarding-lead ${stubs.leadCaptureCalls}x; expected 0`,
      );
    }
    await context.close();
  }

  {
    for (const routeName of ["talk", "polish", "diy"] as const) {
      const proof = ROUTE_PROOF[routeName];
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await preparePage(page);

      await page.goto(`${baseUrl}/r/${proof.token}${q}`, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: /how your marketing scores today/i }).waitFor({
        timeout: 30_000,
      });
      const reportTitle = await page.title();
      if (reportTitle !== "Your Marketing Health Check | Bullfinch Digital") {
        throw new Error(`Bullfinch report title was "${reportTitle}"`);
      }
      if (!(await page.getByText("Your Marketing Health Check").first().isVisible())) {
        throw new Error("Bullfinch report eyebrow missing");
      }
      if ((await page.getByText("Your Digital Health Report").count()) > 0) {
        throw new Error("Bullfinch report still shows the marktr eyebrow");
      }
      await page.getByRole("heading", { name: proof.heading }).waitFor();
      const primaryHref = await page.getByRole("link", { name: proof.primary }).getAttribute("href");
      for (const snippet of proof.hrefIncludes) {
        if (!primaryHref?.includes(snippet)) {
          throw new Error(
            `Bullfinch ${routeName} primary href missing "${snippet}": ${primaryHref}`,
          );
        }
      }
      if (routeName === "talk") {
        if ((await page.getByText("Not checked").count()) < 2) {
          throw new Error("Bullfinch no-handles report did not show Not checked");
        }
        if (
          !(await page
            .getByText("Based on your website and story. Add your Instagram for a full score.")
            .isVisible())
        ) {
          throw new Error("Bullfinch overall note missing");
        }
        if ((await page.getByText(FINDINGS[3].finding).count()) > 0) {
          throw new Error("Bullfinch no-handles report still shows the social finding");
        }
      }
      if (routeName === "polish") {
        if ((await page.getByText("Not checked").count()) > 0) {
          throw new Error("Bullfinch report with handles showed Not checked");
        }
        if (!(await page.getByText("70").first().isVisible())) {
          throw new Error("Bullfinch polish social score missing");
        }
      }
      if (routeName === "diy" && (await page.getByText("Not checked").count()) > 0) {
        throw new Error("Bullfinch diy report with a handle showed Not checked");
      }
      if (routeName !== "diy" && primaryHref && /utm_content=(talk|polish|diy)/.test(primaryHref)) {
        const content = primaryHref.match(/utm_content=([^&]+)/)?.[1];
        if (content !== routeName) {
          throw new Error(`Bullfinch ${routeName} utm_content was ${content}`);
        }
      }
      await page.getByRole("heading", { name: "Send me my score" }).waitFor();
      const tips = page.getByRole("checkbox", { name: "Also send me occasional marketing tips" });
      if (await tips.isChecked()) {
        throw new Error("Send-score marketing checkbox should start unticked");
      }
      await shoot(page, path.join(dir, `report-${routeName}-${viewport.name}.png`));
      await context.close();
    }
  }

  {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await preparePage(page);
    await page.goto(`${baseUrl}/r/${PUBLIC_TOKEN}${q}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Send me my score" }).waitFor();
    await page.getByLabel("Email").fill("visual-check@example.com");
    await page.getByRole("button", { name: "Email my score" }).click();
    await page.getByText("Sent. Check your inbox (and spam, just in case).").waitFor();
    await shoot(page, path.join(dir, `report-send-sent-${viewport.name}.png`));
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await preparePage(page);
    await page.route("**/functions/v1/capture-report-lead", (route) =>
      route.fulfill({
        status: 502,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "gmail_send_failed" }),
      }),
    );
    await page.goto(`${baseUrl}/r/${PUBLIC_TOKEN}${q}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Send me my score" }).waitFor();
    await page.getByLabel("Email").fill("visual-check@example.com");
    await page.getByRole("button", { name: "Email my score" }).click();
    await page.getByText("We couldn't send that just now. Please try again.").waitFor();
    if ((await page.getByRole("button", { name: "Email my score" }).count()) !== 1) {
      throw new Error("Send-score error state hid the retry button");
    }
    await shoot(page, path.join(dir, `report-send-error-${viewport.name}.png`));
    await context.close();
  }
}

// ---------------------------------------------------------------- diffing

type DiffRow = { step: string; viewport: string; diff: number; note: string };

function diffPair(baseFile: string, headFile: string, outFile: string): { diff: number; note: string } {
  const a = PNG.sync.read(readFileSync(baseFile));
  const b = PNG.sync.read(readFileSync(headFile));

  if (a.width !== b.width || a.height !== b.height) {
    return {
      diff: -1,
      note: `size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`,
    };
  }

  const out = new PNG({ width: a.width, height: a.height });
  const diff = pixelmatch(a.data, b.data, out.data, a.width, a.height, {
    threshold: 0,
    includeAA: false,
  });
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, PNG.sync.write(out));
  return { diff, note: diff === 0 ? "identical" : "" };
}

// ---------------------------------------------------------------- main

async function main() {
  rmSync(path.join(OUT, "marktr"), { recursive: true, force: true });
  rmSync(path.join(OUT, "bullfinch"), { recursive: true, force: true });
  rmSync(path.join(OUT, "diff"), { recursive: true, force: true });

  prepareWorktree();
  const browser = await chromium.launch();

  // Servers run one at a time: both trees share node_modules, so a single Vite
  // cache directory cannot serve two dev servers at once.
  console.log(`\nbaseline (${BASELINE_REF}) on :${BASELINE_PORT}`);
  let server = await startServer(WORKTREE, BASELINE_PORT);
  try {
    for (const viewport of VIEWPORTS) {
      console.log(`  marktr @ ${viewport.name}px`);
      await captureMarktr(
        `http://127.0.0.1:${BASELINE_PORT}`,
        browser,
        viewport,
        path.join(OUT, "marktr/baseline"),
      );
    }
  } finally {
    server.kill("SIGTERM");
  }

  console.log(`\nbranch on :${BRANCH_PORT}`);
  server = await startServer(ROOT, BRANCH_PORT);
  try {
    for (const viewport of VIEWPORTS) {
      console.log(`  marktr @ ${viewport.name}px`);
      await captureMarktr(
        `http://127.0.0.1:${BRANCH_PORT}`,
        browser,
        viewport,
        path.join(OUT, "marktr/branch"),
      );
      console.log(`  bullfinch @ ${viewport.name}px`);
      await captureBullfinch(
        `http://127.0.0.1:${BRANCH_PORT}`,
        browser,
        viewport,
        path.join(OUT, "bullfinch"),
      );
    }
  } finally {
    server.kill("SIGTERM");
  }

  await browser.close();

  const rows: DiffRow[] = [];
  for (const step of MARKTR_STEPS) {
    for (const viewport of VIEWPORTS) {
      const name = `${step}-${viewport.name}.png`;
      const { diff, note } = diffPair(
        path.join(OUT, "marktr/baseline", name),
        path.join(OUT, "marktr/branch", name),
        path.join(OUT, "diff", name),
      );
      rows.push({ step, viewport: `${viewport.name}px`, diff, note });
    }
  }

  console.log("\nmarktr pixel diffs (baseline vs branch)\n");
  console.log("| Step | Viewport | Diff pixels | Note |");
  console.log("|---|---|---|---|");
  for (const r of rows) {
    console.log(`| ${r.step} | ${r.viewport} | ${r.diff < 0 ? "n/a" : r.diff} | ${r.note} |`);
  }

  const failures = rows.filter((r) => r.diff !== 0);
  console.log(
    failures.length === 0
      ? "\nAll marktr steps are pixel-identical."
      : `\n${failures.length} step(s) differ — see docs/phase2-proof/diff.`,
  );
  process.exitCode = failures.length === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
