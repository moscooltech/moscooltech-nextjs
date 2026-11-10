import { z } from "zod";
import { bindings } from "@/db";

/**
 * Draft generation over any OpenAI-compatible chat endpoint.
 *
 * Workers Free gives 10 ms of CPU, but waiting on a network response does not
 * consume CPU, so a single blocking call is affordable. Wall-clock time is
 * capped with AbortSignal to stay under the request timeout.
 */

const DraftSchema = z.object({
  title: z.string().trim().min(10).max(200),
  meta_description: z.string().trim().max(200).optional().default(""),
  content: z.string().trim().min(200),
  faqs: z
    .array(z.object({ question: z.string().trim().min(5), answer: z.string().trim().min(5) }))
    .optional()
    .default([]),
});

export type Draft = z.infer<typeof DraftSchema>;

export type DraftInput = {
  topic: string;
  keyword?: string | null;
  category?: string | null;
  tone?: string | null;
  targetWords?: number | null;
  faqCount?: number | null;
};

export function aiConfigured(): boolean {
  return Boolean(bindings().AI_API_KEY);
}

export function providerName(): string {
  return bindings().AI_PROVIDER || "openai";
}

export function modelName(): string {
  return bindings().AI_MODEL || "gpt-4o-mini";
}

function baseUrl(): string {
  return (bindings().AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
}

const SYSTEM = `You write for Moscool Technical Services, an HVAC, refrigeration,
electrical and solar company in Ogun/Lagos, Nigeria. Write practical, specific
Nigerian-context content with no invented statistics, prices or certifications.

Return ONE JSON object and nothing else, with these keys:
  "title"            string, 40-70 characters, no clickbait
  "meta_description" string, at most 155 characters
  "content"          string, the article body as plain text using this line markup:
                       "## " for a section heading
                       "### " for a subheading
                       "- " for a bullet item
                       "**text**" for emphasis
                     Separate paragraphs with a blank line.
  "faqs"             array of {"question", "answer"} objects`;

function buildPrompt(input: DraftInput): string {
  const words = input.targetWords ?? 1200;
  const faqs = input.faqCount ?? 4;
  return [
    `Topic: ${input.topic}`,
    input.keyword ? `Primary keyword to work in naturally: ${input.keyword}` : "",
    `Format: ${input.category === "portfolio" ? "a portfolio case study" : "a how-to guide"}`,
    `Tone: ${input.tone ?? "practical"}`,
    `Length: roughly ${words} words`,
    `Include exactly ${faqs} frequently-asked questions.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function stripFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export async function generateDraft(input: DraftInput): Promise<Draft> {
  const key = bindings().AI_API_KEY;
  if (!key) throw new Error("AI_API_KEY is not configured.");

  const response = await fetch(`${baseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelName(),
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildPrompt(input) },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });

  const text = await response.text();
  if (!response.ok) {
    let detail = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      detail = parsed.error?.message ?? detail;
    } catch {
      /* keep the raw slice */
    }
    throw new Error(`${providerName()} responded ${response.status}: ${detail}`);
  }

  const payload = JSON.parse(text) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) throw new Error("The model returned an empty response.");

  let json: unknown;
  try {
    json = JSON.parse(stripFences(raw));
  } catch {
    throw new Error("The model did not return valid JSON.");
  }

  const parsed = DraftSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Draft failed validation (${issue?.path.join(".")}): ${issue?.message}`);
  }
  return parsed.data;
}
