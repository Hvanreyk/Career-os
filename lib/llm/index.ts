import OpenAI from 'openai';
import 'dotenv/config';
import type { ScoringOutput } from '../scoring/types';
import type { LLMReport, LLMReportSections } from './types';
import { buildSystemPrompt, buildUserMessage } from './prompt';

// Model is configurable so we can move up/down the cost/quality curve without a
// code change. `gpt-4o-mini` is a real, JSON-capable, low-cost default — the
// previous hard-coded 'gpt-5.4-mini' is not a real model id and 404s at runtime.
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const MAX_RETRIES = 2;
const TIMEOUT_MS = 30_000;

export class LLMReportError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'LLMReportError';
  }
}

function isRequiredSectionsShape(value: unknown): value is LLMReportSections {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.where_you_stand === 'string' &&
    typeof v.matched_paths === 'string' &&
    typeof v.what_to_do_next === 'string'
  );
}

export async function generateReport(scoringOutput: ScoringOutput): Promise<LLMReport> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LLMReportError('OPENAI_API_KEY is not set');
  }

  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: MAX_RETRIES });

  let response;
  try {
    response = await client.chat.completions.create({
      model: MODEL,
      // Room for the richer per-action reasoning (why this, why now, why this
      // order) the report now asks the model to write for each recommendation.
      max_completion_tokens: 4096,
      // Low temperature: the underlying scoring (fit_band, gaps, actions) is
      // deterministic — the prose narrating it shouldn't add its own variance
      // on top for an identical ScoringOutput.
      temperature: 0.2,
      // Force valid JSON so we never have to salvage prose into sections.
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserMessage(scoringOutput) },
      ],
    });
  } catch (err) {
    throw new LLMReportError(`OpenAI request failed (model: ${MODEL})`, err);
  }

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new LLMReportError('Empty response from OpenAI API');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LLMReportError(
      `Model returned non-JSON output. First 300 chars: ${text.slice(0, 300)}`,
    );
  }

  if (!isRequiredSectionsShape(parsed)) {
    throw new LLMReportError('Response missing one or more required section keys');
  }
  const sections = parsed;

  const markdown = [
    sections.where_you_stand,
    sections.matched_paths,
    sections.what_to_do_next,
  ].join('\n\n');

  return {
    sections,
    markdown,
    model: MODEL,
    usage: {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
    },
  };
}
