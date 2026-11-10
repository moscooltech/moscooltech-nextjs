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
  return Boolean(bindings().AI) || Boolean(bindings().AI_API_KEY);
}

export function providerName(): string {
  return bindings().AI_PROVIDER || (bindings().AI ? "workers-ai" : "openai");
}

export function modelName(): string {
  return bindings().AI_MODEL || (bindings().AI ? "@cf/meta/llama-3.3-70b-instruct-fp8-fast" : "gpt-4o-mini");
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

/** JSON Schema mirroring DraftSchema, used for Workers AI guided (JSON-mode) output. */
const DraftJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    meta_description: { type: "string" },
    content: { type: "string" },
    faqs: {
      type: "array",
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
      },
    },
  },
  required: ["title", "meta_description", "content", "faqs"],
};

type ChatMessage = { role: string; content: string };

function messagesFor(input: DraftInput): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: buildPrompt(input) },
  ];
}

/**
 * Workers AI binding — no API key, runs inside the platform, guided JSON output
 * (supported by llama-3.3 models). Billed in Neurons; the Free plan includes a
 * daily allocation that comfortably covers the two-topic-per-run cron drain.
 */
async function runOnWorkersAi(messages: ChatMessage[]): Promise<string> {
  const ai = bindings().AI;
  if (!ai) throw new Error("The Workers AI binding is not available on this Worker.");

  const result = await ai.run(modelName(), {
    messages,
    response_format: { type: "json_schema", json_schema: DraftJsonSchema },
    temperature: 0.7,
    max_tokens: 8000,
  });

  const response = (result as { response?: unknown }).response;
  if (typeof response === "string" && response.trim()) return response;
  if (response && typeof response === "object") return JSON.stringify(response);
  throw new Error("Workers AI returned an empty response.");
}

/** Any OpenAI-compatible chat endpoint (AI_API_KEY + AI_BASE_URL). */
async function runOnOpenAiCompatible(messages: ChatMessage[]): Promise<string> {
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
      messages,
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
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("The model returned an empty response.");
  return content;
}

export async function generateDraft(input: DraftInput): Promise<Draft> {
  if (!aiConfigured()) {
    throw new Error("AI is not configured: no Workers AI binding and no AI_API_KEY.");
  }

  const messages = messagesFor(input);
  const raw = bindings().AI
    ? await runOnWorkersAi(messages)
    : await runOnOpenAiCompatible(messages);

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
