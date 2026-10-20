// Supabase Edge Function: generate-plan
// Deploy with: supabase functions deploy generate-plan
// Set secret with: supabase secrets set OPENAI_API_KEY=sk-...
//
// Builds a structured day-by-day plan from a strategy. Nothing is saved here.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROMPT_VERSION = "plan_v1";
const FIRST_HALF_PROMPT_VERSION = "plan_v1_days_1_15";
const MODEL = "gpt-5.5";
const LOG_BODY_LIMIT = 300;

function maxOutputTokensForDays(dayCount: number): number {
  return 1500 + 220 * dayCount;
}

const PLAN_LENGTHS = [7, 14, 30] as const;
type PlanLengthDays = (typeof PLAN_LENGTHS)[number];

const DAY_KINDS = ["post", "prep", "review", "rest"] as const;
type DayKind = (typeof DAY_KINDS)[number];

const MAX_PLAN_TITLE = 80;
const MAX_DAY_TITLE = 80;
const MAX_TASK = 400;
const MAX_BRIEF = 500;
const MAX_WHY = 180;
const MAX_CHANNEL = 40;
const MAX_FORMAT = 40;
const MIN_MINUTES = 5;
const MAX_MINUTES = 120;

type GenerateInput = {
  strategy_id?: string;
  length_days?: number;
  extend_from_plan_id?: string;
};

type GeneratedDay = {
  day_number: number;
  kind: DayKind;
  title: string;
  task: string;
  channel: string | null;
  format: string | null;
  minutes: number | null;
  brief: string | null;
  why: string | null;
};

type GeneratedPlan = {
  title: string;
  days: GeneratedDay[];
};

function trimForLog(body: unknown): string {
  let text: string;
  try {
    text = typeof body === "string" ? body : JSON.stringify(body);
  } catch {
    text = String(body);
  }
  if (text.length <= LOG_BODY_LIMIT) return text;
  return `${text.slice(0, LOG_BODY_LIMIT)}…`;
}

function logFailure(status: number, body: unknown) {
  console.error("[generate-plan]", status, trimForLog(body));
}

function json(resBody: unknown, status = 200, options?: { log?: boolean }) {
  if (status >= 400 && options?.log !== false) logFailure(status, resBody);
  return new Response(JSON.stringify(resBody), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

function corsPreflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  return null;
}

function extractStructuredOutput(response: any): {
  outputText: string;
  messageTexts: string[];
  messageItemCount: number;
  outputItemTypes: string[];
} {
  const output = Array.isArray(response?.output) ? response.output : [];
  const messageTexts: string[] = [];
  let messageItemCount = 0;

  for (const item of output) {
    const itemType = item?.type;
    if (itemType !== "message") continue;
    messageItemCount += 1;
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const partType = part?.type;
      if (partType === "output_text" && typeof part?.text === "string" && part.text.trim()) {
        messageTexts.push(part.text);
      } else if (partType === "text" && typeof part?.text === "string" && part.text.trim()) {
        messageTexts.push(part.text);
      } else if (typeof part?.value === "string" && part.value.trim()) {
        messageTexts.push(part.value);
      }
    }
  }

  const helperText =
    typeof response?.output_text === "string" && response.output_text.trim()
      ? response.output_text
      : "";
  const joinedMessageText = messageTexts.join("\n").trim();
  const outputText = helperText || joinedMessageText;

  return {
    outputText,
    messageTexts,
    messageItemCount,
    outputItemTypes: output.map((item: any) => item?.type ?? "unknown"),
  };
}

function logOpenAiResponse(label: string, response: any) {
  try {
    console.log(
      `[generate-plan] ${label} OpenAI response`,
      JSON.stringify(response, null, 2)
    );
  } catch (err) {
    console.log(`[generate-plan] ${label} OpenAI response (stringify failed)`, err);
    console.log(response);
  }
}

function list(arr: unknown) {
  return Array.isArray(arr) && arr.length ? arr.join("; ") : "Not provided";
}

function isPlanLength(value: unknown): value is PlanLengthDays {
  return typeof value === "number" && (PLAN_LENGTHS as readonly number[]).includes(value);
}

function isDayKind(value: unknown): value is DayKind {
  return typeof value === "string" && (DAY_KINDS as readonly string[]).includes(value);
}

function clampText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(value: unknown, max: number): string | null {
  const text = clampText(value, max);
  return text ? text : null;
}

function clampMinutes(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < MIN_MINUTES) return MIN_MINUTES;
  if (rounded > MAX_MINUTES) return MAX_MINUTES;
  return rounded;
}

function parseBrandStorySummary(raw: unknown): {
  foundingStory: string;
  pointOfView: string;
  positioningStatement: string;
  brandPurpose: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const source =
    record.output && typeof record.output === "object"
      ? (record.output as Record<string, unknown>)
      : record;
  const foundingStory = typeof source.foundingStory === "string" ? source.foundingStory.trim() : "";
  const pointOfView = typeof source.pointOfView === "string" ? source.pointOfView.trim() : "";
  const positioningStatement =
    typeof source.positioningStatement === "string" ? source.positioningStatement.trim() : "";
  const brandPurpose = typeof source.brandPurpose === "string" ? source.brandPurpose.trim() : "";
  if (!foundingStory && !pointOfView && !positioningStatement && !brandPurpose) return null;
  return { foundingStory, pointOfView, positioningStatement, brandPurpose };
}

function extractWeekThemes(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== "object") return [];
  const themes = (parsed as Record<string, unknown>).week_themes;
  if (!Array.isArray(themes)) return [];
  return themes
    .filter((theme): theme is string => typeof theme === "string" && Boolean(theme.trim()))
    .map((theme) => theme.trim().slice(0, 120));
}

function oneLineDaySummary(day: GeneratedDay): string {
  const task = day.task.replace(/\s+/g, " ").trim().slice(0, 140);
  return `Day ${day.day_number} [${day.kind}] ${day.title}: ${task}`;
}

function validatePlanOutput(
  parsed: unknown,
  expectedCount: number,
  startDay = 1
): GeneratedPlan | null {
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const title = clampText(record.title, MAX_PLAN_TITLE);
  if (!title) return null;
  if (!Array.isArray(record.days) || record.days.length !== expectedCount) return null;

  const days: GeneratedDay[] = [];
  for (let i = 0; i < record.days.length; i++) {
    const item = record.days[i];
    if (!item || typeof item !== "object") return null;
    const day = item as Record<string, unknown>;
    const dayNumber = day.day_number;
    if (
      typeof dayNumber !== "number" ||
      !Number.isInteger(dayNumber) ||
      dayNumber !== startDay + i
    ) {
      return null;
    }
    if (!isDayKind(day.kind)) return null;
    const dayTitle = clampText(day.title, MAX_DAY_TITLE);
    const task = clampText(day.task, MAX_TASK);
    if (!dayTitle || !task) return null;

    days.push({
      day_number: dayNumber,
      kind: day.kind,
      title: dayTitle,
      task,
      channel: optionalText(day.channel, MAX_CHANNEL),
      format: optionalText(day.format, MAX_FORMAT),
      minutes: clampMinutes(day.minutes),
      brief: optionalText(day.brief, MAX_BRIEF),
      why: optionalText(day.why, MAX_WHY),
    });
  }

  return { title, days };
}

function invalidModelJson(extracted: ReturnType<typeof extractStructuredOutput>, data: any) {
  return json(
    {
      error: "Model response did not contain valid JSON.",
      raw: extracted.outputText,
      response_status: data?.status ?? null,
      incomplete_details: data?.incomplete_details ?? null,
      output_item_types: extracted.outputItemTypes,
      message_item_count: extracted.messageItemCount,
    },
    500
  );
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day_number: { type: "integer" },
          kind: { type: "string", enum: ["post", "prep", "review", "rest"] },
          title: { type: "string" },
          task: { type: "string" },
          channel: { anyOf: [{ type: "string" }, { type: "null" }] },
          format: { anyOf: [{ type: "string" }, { type: "null" }] },
          minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
          brief: { anyOf: [{ type: "string" }, { type: "null" }] },
          why: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: [
          "day_number",
          "kind",
          "title",
          "task",
          "channel",
          "format",
          "minutes",
          "brief",
          "why",
        ],
      },
    },
  },
  required: ["title", "days"],
};

const FIRST_HALF_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    week_themes: {
      type: "array",
      items: { type: "string" },
    },
    days: RESPONSE_SCHEMA.properties.days,
  },
  required: ["title", "week_themes", "days"],
};

function usageForLog(data: any) {
  const usage = data?.usage;
  if (!usage || typeof usage !== "object") return null;
  return {
    input_tokens: usage.input_tokens ?? null,
    output_tokens: usage.output_tokens ?? null,
    total_tokens: usage.total_tokens ?? null,
  };
}

function isIncompleteResponse(data: any): boolean {
  return data?.status === "incomplete";
}

function logTruncation(options: {
  label: string;
  lengthDays: number;
  dayStart: number;
  dayEnd: number;
  attempt: number;
  data: any;
  parseFailed: boolean;
}) {
  console.warn("[generate-plan] truncated or unparseable output", {
    label: options.label,
    length_days: options.lengthDays,
    day_start: options.dayStart,
    day_end: options.dayEnd,
    attempt: options.attempt,
    response_status: options.data?.status ?? null,
    incomplete_details: options.data?.incomplete_details ?? null,
    parse_failed: options.parseFailed,
    usage: usageForLog(options.data),
  });
}

function parseModelJson(outputText: string): { parsed: unknown; parseFailed: boolean } {
  try {
    return { parsed: JSON.parse(outputText), parseFailed: false };
  } catch {
    const match = String(outputText).match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { parsed: JSON.parse(match[0]), parseFailed: false };
      } catch {
        return { parsed: null, parseFailed: true };
      }
    }
    return { parsed: null, parseFailed: true };
  }
}

function buildPrompt(options: {
  lengthDays: PlanLengthDays;
  dayStart?: number;
  dayEnd?: number;
  maxOutputTokens: number;
  includeWeekThemesInOutput?: boolean;
  lockedTitle?: string | null;
  weekThemes?: string[] | null;
  priorDaySummaries?: string[] | null;
  strategyTitle: string;
  positioning: Record<string, any>;
  messaging: Record<string, any>;
  campaignIdeas: Array<Record<string, any>>;
  suggestedContent: Array<Record<string, any>>;
  channels: Array<Record<string, any>>;
  first14Days: unknown;
  aims: Array<Record<string, any>>;
  personas: Array<Record<string, any>>;
  brandStory: {
    foundingStory: string;
    pointOfView: string;
    positioningStatement: string;
    brandPurpose: string;
  } | null;
  previousDays: Array<Record<string, any>> | null;
}) {
  const {
    lengthDays,
    strategyTitle,
    positioning,
    messaging,
    campaignIdeas,
    suggestedContent,
    channels,
    first14Days,
    aims,
    personas,
    brandStory,
    previousDays,
  } = options;
  const dayStart = options.dayStart ?? 1;
  const dayEnd = options.dayEnd ?? lengthDays;
  const dayCount = dayEnd - dayStart + 1;
  const maxOutputTokens = options.maxOutputTokens;

  const channelsBlock = channels.length
    ? channels
        .map((channel, idx) => {
          const posts =
            typeof channel.posts_per_week === "number" ? channel.posts_per_week : "Not provided";
          return `Channel ${idx + 1}:
- Name: ${channel.name || "Not provided"}
- Role: ${channel.role || "Not provided"}
- Posts per week: ${posts}
- Best times: ${list(channel.best_times)}
- Formats: ${list(channel.formats)}`;
        })
        .join("\n\n")
    : "- Not provided";

  const aimsBlock = aims.length
    ? aims
        .map(
          (aim, idx) => `Aim ${idx + 1}:
- Title: ${aim.title || "Not provided"}
- Type: ${aim.aim_type || "Not provided"}
- Description: ${aim.description || "Not provided"}`
        )
        .join("\n\n")
    : "- Not provided";

  const personasBlock = personas.length
    ? personas
        .map(
          (icp, idx) => `Persona ${idx + 1}:
- Name: ${icp.name || "Not provided"}
- Description: ${icp.description || "Not provided"}
- Goals: ${list(icp.goals)}
- Pain points: ${list(icp.pain_points)}`
        )
        .join("\n\n")
    : "- Not provided";

  const ideasBlock = campaignIdeas.length
    ? campaignIdeas
        .map(
          (idea, idx) => `Idea ${idx + 1}: ${idea.name || "Not provided"}
- Hook: ${idea.hook || "Not provided"}
- Angle: ${idea.angle || "Not provided"}
- CTA: ${idea.cta || "Not provided"}`
        )
        .join("\n\n")
    : "- Not provided";

  const suggestedBlock = suggestedContent.length
    ? suggestedContent
        .map(
          (item, idx) =>
            `Suggested ${idx + 1}: ${item.type || "Not provided"} — ${item.rationale || "Not provided"}`
        )
        .join("\n")
    : "- Not provided";

  const first14 =
    Array.isArray(first14Days) && first14Days.length
      ? first14Days.map((item) => `- ${String(item)}`).join("\n")
      : "- Not provided";

  const storyBlock = brandStory
    ? `- Positioning: ${brandStory.positioningStatement || "Not provided"}
- Purpose: ${brandStory.brandPurpose || "Not provided"}
- Point of view: ${brandStory.pointOfView || "Not provided"}
- Founding story: ${brandStory.foundingStory || "Not provided"}`
    : "- Not provided";

  const previousBlock = previousDays
    ? previousDays
        .map((day) => {
          const notes = typeof day.notes === "string" && day.notes.trim() ? day.notes.trim() : "";
          const results =
            typeof day.results === "string" && day.results.trim() ? day.results.trim() : "";
          return `Day ${day.day_number} [${day.kind || "unknown"}] ${day.status || "todo"}: ${day.title || ""}
- Task: ${day.task || ""}
${notes ? `- Notes: ${notes}` : ""}
${results ? `- Results: ${results}` : ""}`;
        })
        .join("\n")
    : "";

  const weekThemesInstruction =
    lengthDays === 7
      ? "- 7 days: no weekly themes needed."
      : `- ${lengthDays} days: give each week a simple theme and keep day titles consistent with that week.`;
  const continuationBlock =
    options.lockedTitle || options.weekThemes?.length || options.priorDaySummaries?.length
      ? `Continue this ${lengthDays}-day plan. Do not start over or repeat earlier days.
- Plan title (reuse exactly): ${options.lockedTitle || "Not provided"}
- Week themes:
${
  options.weekThemes?.length
    ? options.weekThemes.map((theme, idx) => `- Week ${idx + 1}: ${theme}`).join("\n")
    : "- Not provided"
}
- Days already written (one line each; do not repeat these tasks or briefs):
${
  options.priorDaySummaries?.length
    ? options.priorDaySummaries.map((line) => `- ${line}`).join("\n")
    : "- Not provided"
}
`
      : "";
  const weekThemesOutput = options.includeWeekThemesInOutput
    ? `Also return week_themes: exactly 5 short labels for weeks 1 to 5 of the full ${lengthDays}-day plan. Days ${dayStart} to ${dayEnd} must follow those themes.
`
    : "";

  return `
You write a day-by-day marketing plan for a small business owner with no team.
Use UK English. Be concise, practical and approachable.
Return STRICT JSON ONLY that matches the given schema. No markdown.

Strategy: ${strategyTitle || "Not provided"}

Positioning:
- One-liner: ${positioning.one_liner || "Not provided"}
- Why us: ${positioning.why_us || "Not provided"}
- Differentiators: ${list(positioning.differentiators)}

Messaging:
- Value props: ${list(messaging.value_props)}
- Pain to promise: ${list(messaging.pain_to_promise)}
- Objections: ${list(messaging.objections_and_rebuttals)}

Campaign ideas:
${ideasBlock}

Suggested content:
${suggestedBlock}

Channels (use these platforms only):
${channelsBlock}

Existing first 14 days notes:
${first14}

Aims:
${aimsBlock}

Personas:
${personasBlock}

Brand story summary:
${storyBlock}

${
  previousBlock
    ? `Previous plan to extend (user notes and results are evidence of what worked and what did not):
${previousBlock}

Extension rules:
- Continue from this previous plan. Do not start the strategy from scratch.
- Build on what worked. Adjust what did not.
- Never repeat tasks word for word.
- Number this new plan from 1 again.
`
    : ""
}
${continuationBlock}
${weekThemesOutput}
Output: exactly ${dayCount} days, numbered ${dayStart} to ${dayEnd}.
Each day has one clear task this owner can finish in the stated minutes (typically 5 to 45).
- kind: post | prep | review | rest
- title: short label
- task: 1 to 3 plain sentences
- For post days: brief is 2 to 4 sentences (angle, which customer it speaks to, call to action). why is one sentence tying the day to the aim. Set channel and format from the strategy channels.
- For non-post days: brief and why may be null. channel and format may be null.
- minutes: integer, typically 5 to 45

Rhythm:
- Respect each channel's posts_per_week. Spread post days across each week in a consistent rhythm.
- Fill other days with small prep tasks (ideas, batch-writing, replying and engaging, a short review) or a light or rest day.
- Include a light or rest day each week.
${dayStart === 1 ? "- Day 1 is an easy win." : "- Continue the existing rhythm. Do not restart the plan."}
${
  dayEnd === lengthDays
    ? "- The last day is a review day: look at what worked, note results, decide what to repeat."
    : `- Do not write the final review yet; that belongs on day ${lengthDays}.`
}
${weekThemesInstruction}

Hard rules:
- Never cite statistics, studies or percentages.
- Never invent testimonials or figures.
- Never claim knowledge of the user's audience data.
- Only suggest platforms already listed in the strategy channels.
- Keep the JSON compact. Short titles. No filler. This ${dayCount}-day slice must fit in ${maxOutputTokens} output tokens.
`;
}

type GeneratedChunk = GeneratedPlan & { weekThemes: string[] };

type ModelCallFailure =
  | { kind: "openai_error"; status: number; details: string }
  | {
      kind: "invalid";
      extracted: ReturnType<typeof extractStructuredOutput>;
      data: any;
    };

async function generatePlanChunk(options: {
  apiKey: string;
  prompt: string;
  maxOutputTokens: number;
  schema: Record<string, unknown>;
  schemaName: string;
  label: string;
  lengthDays: number;
  dayStart: number;
  dayEnd: number;
  validate: (parsed: unknown) => GeneratedChunk | null;
}): Promise<{ ok: true; value: GeneratedChunk } | { ok: false; failure: ModelCallFailure }> {
  const emptyExtracted = {
    outputText: "",
    messageTexts: [],
    messageItemCount: 0,
    outputItemTypes: [],
  };
  let lastExtracted: ReturnType<typeof extractStructuredOutput> = emptyExtracted;
  let lastData: any = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: options.prompt,
        reasoning: {
          effort: "low",
        },
        max_output_tokens: options.maxOutputTokens,
        text: {
          format: {
            type: "json_schema",
            name: options.schemaName,
            schema: options.schema,
            strict: true,
          },
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      logFailure(resp.status, errText);
      return {
        ok: false,
        failure: { kind: "openai_error", status: resp.status, details: errText },
      };
    }

    const data = await resp.json();
    const callLabel = attempt === 0 ? options.label : `${options.label}-retry`;
    logOpenAiResponse(callLabel, data);
    const extracted = extractStructuredOutput(data);
    lastExtracted = extracted;
    lastData = data;
    const { parsed, parseFailed } = parseModelJson(extracted.outputText);

    if (isIncompleteResponse(data) || parseFailed) {
      logTruncation({
        label: callLabel,
        lengthDays: options.lengthDays,
        dayStart: options.dayStart,
        dayEnd: options.dayEnd,
        attempt,
        data,
        parseFailed,
      });
    }

    const validated = options.validate(parsed);
    if (validated) {
      return { ok: true, value: validated };
    }

    if (attempt === 0) {
      console.warn("[generate-plan] malformed output; retrying once", {
        label: options.label,
        length_days: options.lengthDays,
        day_start: options.dayStart,
        day_end: options.dayEnd,
      });
    }
  }

  return {
    ok: false,
    failure: { kind: "invalid", extracted: lastExtracted, data: lastData },
  };
}

function chunkFromParsed(
  parsed: unknown,
  expectedCount: number,
  startDay: number
): GeneratedChunk | null {
  const plan = validatePlanOutput(parsed, expectedCount, startDay);
  if (!plan) return null;
  return { ...plan, weekThemes: extractWeekThemes(parsed) };
}

function failFromModel(failure: ModelCallFailure) {
  if (failure.kind === "openai_error") {
    return json(
      { error: "OpenAI call failed", status: failure.status, details: failure.details },
      500,
      { log: false }
    );
  }
  return invalidModelJson(failure.extracted, failure.data);
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  const startedAt = Date.now();
  let requestLengthDays: number | null = null;
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !apiKey) {
      return json({ error: "Missing server env vars" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthenticated" }, 401);
    }

    // Same Pro definition as public.user_has_pro_access / src/lib/proAccess.ts
    const { data: hasProAccess, error: proError } = await supabase.rpc(
      "user_has_pro_access"
    );
    if (proError) {
      logFailure(500, proError);
      return json({ error: "Unable to verify subscription" }, 500, { log: false });
    }
    if (!hasProAccess) {
      return json({ error: "Pro subscription required" }, 403);
    }

    const body = (await req.json()) as Partial<GenerateInput>;
    const strategyId =
      typeof body.strategy_id === "string" && body.strategy_id.trim()
        ? body.strategy_id.trim()
        : "";
    if (!strategyId) {
      return json({ error: "strategy_id is required" }, 400);
    }
    if (!isPlanLength(body.length_days)) {
      return json({ error: "length_days must be 7, 14 or 30" }, 400);
    }
    const lengthDays = body.length_days;
    requestLengthDays = lengthDays;
    const extendFromPlanId =
      typeof body.extend_from_plan_id === "string" && body.extend_from_plan_id.trim()
        ? body.extend_from_plan_id.trim()
        : "";

    const { data: strategyRow, error: strategyError } = await supabase
      .from("strategies")
      .select("id, user_id, brand_id, lineage_id, title, strategy")
      .eq("id", strategyId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (strategyError || !strategyRow) {
      return json({ error: "Strategy not found" }, 404);
    }

    const strategyPayload =
      strategyRow.strategy && typeof strategyRow.strategy === "object"
        ? (strategyRow.strategy as Record<string, any>)
        : {};
    const positioning =
      strategyPayload.positioning && typeof strategyPayload.positioning === "object"
        ? strategyPayload.positioning
        : {};
    const messaging =
      strategyPayload.messaging && typeof strategyPayload.messaging === "object"
        ? strategyPayload.messaging
        : {};
    const campaignIdeas = Array.isArray(strategyPayload.campaign_ideas)
      ? strategyPayload.campaign_ideas
      : [];
    const suggestedContent = Array.isArray(strategyPayload.suggested_content)
      ? strategyPayload.suggested_content
      : [];
    const channelPlan =
      strategyPayload.channel_plan && typeof strategyPayload.channel_plan === "object"
        ? strategyPayload.channel_plan
        : {};
    const channels = Array.isArray(channelPlan.channels) ? channelPlan.channels : [];
    const first14Days = channelPlan.first_14_days;

    const lineageId = strategyRow.lineage_id as string;
    const brandId = strategyRow.brand_id as string;

    const [aimLinksResult, icpLinksResult, storyResult] = await Promise.all([
      supabase
        .from("strategy_aims")
        .select("aim_lineage_id, aim_title_snapshot, aim_type_snapshot")
        .eq("user_id", user.id)
        .eq("strategy_lineage_id", lineageId),
      supabase
        .from("strategy_targets")
        .select("icp_lineage_id, icp_name_snapshot")
        .eq("user_id", user.id)
        .eq("strategy_lineage_id", lineageId),
      brandId
        ? supabase
            .from("brand_story_results")
            .select("story_data")
            .eq("user_id", user.id)
            .eq("brand_id", brandId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (aimLinksResult.error) {
      return json({ error: "Failed to load strategy aims" }, 500);
    }
    if (icpLinksResult.error) {
      return json({ error: "Failed to load strategy personas" }, 500);
    }

    const aimLineageIds = Array.from(
      new Set(
        ((aimLinksResult.data ?? []) as Array<{ aim_lineage_id?: string }>)
          .map((row) => row.aim_lineage_id)
          .filter((id): id is string => typeof id === "string" && Boolean(id))
      )
    );
    const icpLineageIds = Array.from(
      new Set(
        ((icpLinksResult.data ?? []) as Array<{ icp_lineage_id?: string }>)
          .map((row) => row.icp_lineage_id)
          .filter((id): id is string => typeof id === "string" && Boolean(id))
      )
    );

    const [aimsResult, icpsResult] = await Promise.all([
      aimLineageIds.length
        ? supabase
            .from("brand_aims")
            .select("lineage_id, title, aim_type, description")
            .eq("user_id", user.id)
            .in("lineage_id", aimLineageIds)
            .is("superseded_at", null)
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      icpLineageIds.length
        ? supabase
            .from("icps")
            .select("lineage_id, name, description, goals, pain_points")
            .eq("user_id", user.id)
            .in("lineage_id", icpLineageIds)
            .is("superseded_at", null)
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (aimsResult.error) {
      return json({ error: "Failed to load aims" }, 500);
    }
    if (icpsResult.error) {
      return json({ error: "Failed to load personas" }, 500);
    }

    const aimsByLineage = new Map(
      ((aimsResult.data ?? []) as Array<Record<string, any>>).map((aim) => [aim.lineage_id, aim])
    );
    const icpsByLineage = new Map(
      ((icpsResult.data ?? []) as Array<Record<string, any>>).map((icp) => [icp.lineage_id, icp])
    );

    const aims = (aimLinksResult.data ?? []).map((link: any) => {
      const current = aimsByLineage.get(link.aim_lineage_id);
      return {
        title: current?.title || link.aim_title_snapshot || "",
        aim_type: current?.aim_type || link.aim_type_snapshot || "",
        description: current?.description || "",
      };
    });

    const personas = (icpLinksResult.data ?? []).map((link: any) => {
      const current = icpsByLineage.get(link.icp_lineage_id);
      return {
        name: current?.name || link.icp_name_snapshot || "",
        description: current?.description || "",
        goals: current?.goals ?? [],
        pain_points: current?.pain_points ?? [],
      };
    });

    const brandStory = parseBrandStorySummary(
      (storyResult.data as { story_data?: unknown } | null)?.story_data
    );

    let previousDays: Array<Record<string, any>> | null = null;
    if (extendFromPlanId) {
      const { data: previousPlan, error: previousPlanError } = await supabase
        .from("plans")
        .select("id, strategy_id")
        .eq("id", extendFromPlanId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (previousPlanError || !previousPlan) {
        return json({ error: "Plan to extend was not found" }, 404);
      }
      if (previousPlan.strategy_id !== strategyId) {
        return json({ error: "extend_from_plan_id must belong to this strategy" }, 400);
      }

      const { data: previousPlanDays, error: previousDaysError } = await supabase
        .from("plan_days")
        .select("day_number, kind, title, task, status, notes, results")
        .eq("plan_id", extendFromPlanId)
        .eq("user_id", user.id)
        .order("day_number", { ascending: true });

      if (previousDaysError) {
        return json({ error: "Failed to load previous plan days" }, 500);
      }
      previousDays = (previousPlanDays ?? []) as Array<Record<string, any>>;
    }

    const promptContext = {
      lengthDays,
      strategyTitle: strategyRow.title,
      positioning,
      messaging,
      campaignIdeas,
      suggestedContent,
      channels,
      first14Days,
      aims,
      personas,
      brandStory,
      previousDays,
    };

    if (lengthDays === 30) {
      const halfTokens = maxOutputTokensForDays(lengthDays);
      const first = await generatePlanChunk({
        apiKey,
        prompt: buildPrompt({
          ...promptContext,
          dayStart: 1,
          dayEnd: 15,
          maxOutputTokens: halfTokens,
          includeWeekThemesInOutput: true,
        }),
        maxOutputTokens: halfTokens,
        schema: FIRST_HALF_RESPONSE_SCHEMA,
        schemaName: FIRST_HALF_PROMPT_VERSION,
        label: "plan-days-1-15",
        lengthDays,
        dayStart: 1,
        dayEnd: 15,
        validate: (parsed) => chunkFromParsed(parsed, 15, 1),
      });
      if (!first.ok) return failFromModel(first.failure);

      const second = await generatePlanChunk({
        apiKey,
        prompt: buildPrompt({
          ...promptContext,
          dayStart: 16,
          dayEnd: 30,
          maxOutputTokens: halfTokens,
          lockedTitle: first.value.title,
          weekThemes: first.value.weekThemes,
          priorDaySummaries: first.value.days.map(oneLineDaySummary),
        }),
        maxOutputTokens: halfTokens,
        schema: RESPONSE_SCHEMA,
        schemaName: PROMPT_VERSION,
        label: "plan-days-16-30",
        lengthDays,
        dayStart: 16,
        dayEnd: 30,
        validate: (parsed) => chunkFromParsed(parsed, 15, 16),
      });
      if (!second.ok) return failFromModel(second.failure);

      const merged = validatePlanOutput(
        {
          title: first.value.title,
          days: [...first.value.days, ...second.value.days],
        },
        30,
        1
      );
      if (!merged) {
        return invalidModelJson(
          {
            outputText: "",
            messageTexts: [],
            messageItemCount: 0,
            outputItemTypes: [],
          },
          null
        );
      }
      return json(merged);
    }

    const maxOutputTokens = maxOutputTokensForDays(lengthDays);
    const single = await generatePlanChunk({
      apiKey,
      prompt: buildPrompt({
        ...promptContext,
        maxOutputTokens,
      }),
      maxOutputTokens,
      schema: RESPONSE_SCHEMA,
      schemaName: PROMPT_VERSION,
      label: "plan",
      lengthDays,
      dayStart: 1,
      dayEnd: lengthDays,
      validate: (parsed) => chunkFromParsed(parsed, lengthDays, 1),
    });
    if (!single.ok) return failFromModel(single.failure);
    return json({ title: single.value.title, days: single.value.days });
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  } finally {
    console.log("[generate-plan] elapsed_ms", Date.now() - startedAt, {
      length_days: requestLengthDays,
    });
  }
});
