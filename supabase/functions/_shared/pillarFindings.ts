export type PillarFinding = {
  dimension: string;
  score: number;
  /** Compatibility text. Same words as observation. */
  finding: string;
  observation: string;
  nextStep: string;
};

export type PillarFindingsPayload = {
  findings: PillarFinding[];
  strengths: string[];
  gaps: string[];
};

/** Words we will not show a business owner. */
export const BANNED_COPY =
  /\b(?:ctas?|call-to-actions?|calls? to action|value propositions?|boilerplate|engag\w*|leverag\w*|enhanc\w*|optimis\w*|optimiz\w*|icp|brand voice|synergy|more compelling|post more|attract more followers)\b/i;

export const UNCHECKED_PILLAR_LINE =
  "No Instagram or Facebook was entered, so we couldn't check this.";

export type FindingSourceText = {
  homepage: string;
  all: string;
};

const OFF_WEBSITE =
  /\b(?:instagram|facebook|tiktok|bio|posting|followers|founder|about page|brand story|story|narrative|social media|socials|last post|posts a week|posts per)\b/i;

export function hasBannedCopy(text: string): boolean {
  return BANNED_COPY.test(text);
}

const WEAK_HIGH_SCORE_STEP =
  /\b(?:maintain|no action|nothing to (?:change|do|add)|already (?:strong|good)|keep (?:this|doing|it)|no change|no further)\b/i;

const SPECIFIC_OBSERVATION =
  /['"“”‘’]|\d|\b(?:homepage|home page|about page|about pages|contact page|instagram|facebook|bio|button)\b/i;

export function isSpecificObservation(text: string): boolean {
  return SPECIFIC_OBSERVATION.test(text);
}

export function isWeakHighScoreStep(score: number, nextStep: string): boolean {
  return score >= 85 && WEAK_HIGH_SCORE_STEP.test(nextStep);
}

export function observationFitsPillar(dimension: string, text: string): boolean {
  if (dimension === "Content Consistency") {
    return /\d|\b(?:instagram|facebook|posts?|followers)\b/i.test(text);
  }
  if (dimension === "Social Presence") {
    return /\b(?:instagram|facebook|bio|followers|profile)\b/i.test(text);
  }
  if (dimension === "Website Clarity") return !OFF_WEBSITE.test(text);
  if (dimension === "Brand Story") {
    return !/\b(?:instagram|facebook|followers|last post)\b/i.test(text);
  }
  return true;
}

function withoutTarget(text: string): string {
  return text
    .replace(/,?\s*which is below the target\b/gi, "")
    .replace(/\bthe target\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
}

function withoutConsider(text: string): string {
  const stripped = text.replace(/^consider\s+/i, "");
  if (stripped === text || !stripped) return text;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function normaliseForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Quoted phrases. An apostrophe inside a word (Let's) does not end the quote. */
export function extractQuotes(text: string): string[] {
  const quotes: string[] = [];
  const closers: Record<string, string> = { '"': '"', "'": "'", "“": "”", "‘": "’" };
  for (let i = 0; i < text.length; i++) {
    const opener = text[i];
    const closer = closers[opener];
    if (!closer) continue;
    if (
      opener === "'" &&
      i > 0 &&
      /[A-Za-z]/.test(text[i - 1]) &&
      /[A-Za-z]/.test(text[i + 1] ?? "")
    ) {
      continue;
    }
    let buf = "";
    let j = i + 1;
    while (j < text.length) {
      const ch = text[j];
      if (
        opener === "'" &&
        ch === "'" &&
        /[A-Za-z]/.test(text[j - 1] ?? "") &&
        /[A-Za-z]/.test(text[j + 1] ?? "")
      ) {
        buf += ch;
        j++;
        continue;
      }
      if (ch === closer) break;
      buf += ch;
      j++;
    }
    if (text[j] === closer) {
      const quote = buf.trim();
      if (quote.length >= 3) quotes.push(quote);
      i = j;
    }
  }
  return quotes;
}

export function quoteAppearsInSource(quote: string, corpus: string): boolean {
  const needle = normaliseForMatch(quote);
  if (needle.length < 3) return true;
  return normaliseForMatch(corpus).includes(needle);
}

export function unverifiedQuotes(text: string, corpus: string): string[] {
  return extractQuotes(text).filter((quote) => !quoteAppearsInSource(quote, corpus));
}

export function dropUnverifiedQuotes(text: string, corpus: string): string {
  let next = text;
  for (const quote of unverifiedQuotes(text, corpus)) {
    const pattern = quote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(`["“”'‘’]${pattern}["“”'‘’]`, "gi"), "");
  }
  return next
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[,:;]\s*$/g, "")
    .replace(/\b(?:like|such as|saying)\s*$/i, "")
    .trim();
}

export function lineAlreadyOnHomepage(
  nextStep: string,
  observation: string,
  homepage: string,
): boolean {
  if (!/\bhomepage\b/i.test(nextStep)) return false;
  if (!/\b(?:add|put|use|place|move|bring|feature)\b/i.test(nextStep)) return false;
  const home = normaliseForMatch(homepage);
  return [...extractQuotes(nextStep), ...extractQuotes(observation)].some((quote) => {
    const needle = normaliseForMatch(quote);
    return needle.length >= 12 && home.includes(needle);
  });
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);
}

/** True when a working-bullet mostly repeats the website observation. */
export function restatesObservation(observation: string, bullet: string): boolean {
  const bulletWords = words(bullet);
  if (bulletWords.length < 3) return false;
  const seen = new Set(words(observation));
  const shared = bulletWords.filter((word) => seen.has(word)).length;
  return shared >= 3 || shared / bulletWords.length >= 0.6;
}

/** Website bullets only, at most two, and none that repeat the observation. */
export function polishWebsiteBullets(observation: string, bullets: string[]): string[] {
  const kept: string[] = [];
  for (const bullet of bullets) {
    const text = bullet.trim();
    if (!text || OFF_WEBSITE.test(text) || hasBannedCopy(text)) continue;
    if (restatesObservation(observation, text)) continue;
    if (kept.some((existing) => restatesObservation(existing, text))) continue;
    kept.push(text);
    if (kept.length === 2) break;
  }
  return kept;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePillarFindings(raw: string): PillarFindingsPayload | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return parsePillarFindings(match[0]);
  }

  const findings = Array.isArray(parsed.findings)
    ? parsed.findings
        .map((item): PillarFinding | null => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const dimension = asText(row.dimension);
          const observation = asText(row.observation) || asText(row.finding);
          const nextStep = asText(row.next_step) || asText(row.nextStep);
          const score = Number(row.score);
          if (!dimension || !observation || Number.isNaN(score)) return null;
          return {
            dimension,
            score,
            finding: observation,
            observation,
            nextStep,
          };
        })
        .filter((item): item is PillarFinding => item !== null)
    : [];

  if (findings.length === 0) return null;

  const strengths = Array.isArray(parsed.strengths)
    ? parsed.strengths.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const gaps = Array.isArray(parsed.gaps)
    ? parsed.gaps.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return { findings, strengths, gaps };
}

/** Drop banned or off-pillar copy. Empty fields fall back to the score-band templates. */
export function polishPillarFindings(
  payload: PillarFindingsPayload,
  source?: FindingSourceText,
): PillarFindingsPayload {
  const findings = payload.findings.map((row) => {
    let observation =
      hasBannedCopy(row.observation) || !observationFitsPillar(row.dimension, row.observation)
        ? ""
        : withoutTarget(row.observation);
    let nextStep = hasBannedCopy(row.nextStep) ? "" : withoutConsider(row.nextStep);
    if (source) {
      observation = dropUnverifiedQuotes(observation, source.all);
      nextStep = dropUnverifiedQuotes(nextStep, source.all);
    }
    if (isWeakHighScoreStep(row.score, nextStep)) nextStep = "";
    if (source && lineAlreadyOnHomepage(nextStep, observation, source.homepage)) nextStep = "";
    if (!observation) nextStep = nextStep && !hasBannedCopy(nextStep) ? nextStep : "";
    return {
      ...row,
      observation,
      nextStep,
      finding: observation,
    };
  });
  const website = findings.find((row) => row.dimension === "Website Clarity");
  return {
    findings,
    strengths: polishWebsiteBullets(website?.observation ?? "", payload.strengths),
    gaps: polishWebsiteBullets(website?.observation ?? "", payload.gaps),
  };
}

export function findingsQualityIssues(
  payload: PillarFindingsPayload,
  measured: string[],
  scoresByDimension: Record<string, number | null>,
  source?: FindingSourceText,
): string[] {
  const issues: string[] = [];
  const have = new Set(payload.findings.map((row) => row.dimension));
  const missing = measured.filter((name) => !have.has(name));
  if (missing.length) issues.push(`Missing findings for: ${missing.join(", ")}.`);
  for (const row of payload.findings) {
    if (hasBannedCopy(row.observation) || hasBannedCopy(row.nextStep)) {
      issues.push(`${row.dimension} uses a banned word. Rewrite it in plain words.`);
    }
    if (row.dimension === "Content Consistency" && /\bthe target\b/i.test(row.observation)) {
      issues.push(
        `${row.dimension} observation must not mention a target. State the count only, and put the weekly aim in next_step.`,
      );
    }
    if (!isSpecificObservation(row.observation) || !observationFitsPillar(row.dimension, row.observation)) {
      issues.push(
        `${row.dimension} must stay on that subject. Website: a homepage line or button. Brand story: the about page or homepage story. Content: followers, days since the last post, or posts in the last 30 days (or say those numbers were missing). Social: the bio, follower count, or which profile was missing.`,
      );
    }
    if (/^consider\b/i.test(row.nextStep.trim())) {
      issues.push(`${row.dimension} next_step must be the action itself. Do not start with "Consider".`);
    }
    if (
      row.dimension === "Brand Story" &&
      row.score >= 85 &&
      /\badd\b[\s\S]{0,40}\b(?:founding|founder) story\b/i.test(row.nextStep)
    ) {
      issues.push(
        `${row.dimension} already has a founder story. Do not tell them to add one. Say where else to use a line from the about page.`,
      );
    }
    const score = scoresByDimension[row.dimension];
    if (typeof score === "number" && isWeakHighScoreStep(score, row.nextStep)) {
      issues.push(
        `${row.dimension} is already strong. Do not say "maintain" or "no action needed". Name one place to reuse what is already working.`,
      );
    }
    if (source) {
      const invented = [
        ...unverifiedQuotes(row.observation, source.all),
        ...unverifiedQuotes(row.nextStep, source.all),
      ];
      if (invented.length) {
        issues.push(
          `${row.dimension} quotes text that is not on the site or in the bio (${invented.join("; ")}). Quote only their existing words, or describe the change without putting a new line in quotes.`,
        );
      }
      if (lineAlreadyOnHomepage(row.nextStep, row.observation, source.homepage)) {
        issues.push(
          `${row.dimension} next_step tells them to add a line to the homepage, but that line is already there. Suggest a different change.`,
        );
      }
    }
  }
  const bannedBullets = [...payload.strengths, ...payload.gaps].filter((item) => hasBannedCopy(item));
  if (bannedBullets.length) issues.push("A website bullet uses a banned word. Rewrite it in plain words.");
  return issues;
}

function rowIsClean(
  row: PillarFinding,
  score: number | null | undefined,
  source?: FindingSourceText,
): boolean {
  if (hasBannedCopy(row.observation) || hasBannedCopy(row.nextStep)) return false;
  if (row.dimension === "Content Consistency" && /\bthe target\b/i.test(row.observation)) return false;
  if (!isSpecificObservation(row.observation) || !observationFitsPillar(row.dimension, row.observation)) {
    return false;
  }
  if (source && unverifiedQuotes(`${row.observation} ${row.nextStep}`, source.all).length) return false;
  if (source && lineAlreadyOnHomepage(row.nextStep, row.observation, source.homepage)) return false;
  if (/^consider\b/i.test(row.nextStep.trim())) return false;
  if (
    row.dimension === "Brand Story" &&
    typeof score === "number" &&
    score >= 85 &&
    /\badd\b[\s\S]{0,40}\b(?:founding|founder) story\b/i.test(row.nextStep)
  ) {
    return false;
  }
  if (typeof score === "number" && isWeakHighScoreStep(score, row.nextStep)) return false;
  return true;
}

/** Keep a good first answer when the retry drops a pillar or makes one worse. */
export function mergePillarFindings(
  first: PillarFindingsPayload,
  retry: PillarFindingsPayload | null,
  scoresByDimension: Record<string, number | null>,
  source?: FindingSourceText,
): PillarFindingsPayload {
  const measured = Object.entries(scoresByDimension)
    .filter(([, score]) => typeof score === "number")
    .map(([name]) => name);
  const sources = retry ? [first, retry] : [first];
  const findings = measured.flatMap((name) => {
    const options = sources
      .map((payload) => payload.findings.find((row) => row.dimension === name))
      .filter((row): row is PillarFinding => Boolean(row));
    if (!options.length) return [];
    const clean = options.find((row) => rowIsClean(row, scoresByDimension[name], source));
    return [clean ?? options[options.length - 1]];
  });
  const bulletSource =
    retry && (retry.strengths.length > 0 || retry.gaps.length > 0) ? retry : first;
  return polishPillarFindings(
    {
      findings,
      strengths: bulletSource.strengths,
      gaps: bulletSource.gaps,
    },
    source,
  );
}

/** Marktr still prints these pillars. Do not claim we counted posts that were never supplied. */
export function applyUncheckedPillarCopy(
  payload: PillarFindingsPayload,
  noProfileEntered: boolean,
): PillarFindingsPayload {
  if (!noProfileEntered) return payload;
  const names = ["Content Consistency", "Social Presence"];
  const findings = payload.findings.map((row) =>
    names.includes(row.dimension)
      ? { ...row, observation: UNCHECKED_PILLAR_LINE, finding: UNCHECKED_PILLAR_LINE }
      : row,
  );
  for (const name of names) {
    if (findings.some((row) => row.dimension === name)) continue;
    findings.push({
      dimension: name,
      score: 0,
      observation: UNCHECKED_PILLAR_LINE,
      finding: UNCHECKED_PILLAR_LINE,
      nextStep: "",
    });
  }
  return { ...payload, findings };
}
