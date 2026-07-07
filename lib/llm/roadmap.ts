import OpenAI from 'openai';
import 'dotenv/config';
import type { Readiness, FinalReadiness, QuizScores } from '../courses/readiness.js';
import type { RecruitingCycle } from '../courses/timeline.js';
import { buildRoadmapSystemPrompt, buildRoadmapUserMessage } from './roadmap-prompt.js';

// Personalised recruiting roadmap generator (Course 1, Module 9).
// Mirrors generateReport in ./index.ts: env-driven model, JSON mode,
// retries/timeout, strict shape validation, usage capture.

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const MAX_RETRIES = 2;
const TIMEOUT_MS = 30_000;

export class RoadmapError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'RoadmapError';
  }
}

/**
 * Deterministic snapshot the roadmap is generated from. Assembled by
 * the create route and stored on the course_roadmaps row — its stable
 * hash bounds LLM cost to one generation per distinct input.
 */
export interface RoadmapInput {
  /** ISO date (yyyy-mm-dd) the plan starts from. */
  today: string;
  readiness: Readiness;
  final_readiness: FinalReadiness | null;
  quiz_scores: QuizScores;
  completed_lesson_ratio: number;
  /** From the onboarding profile when available. */
  target_firm_tier: string | null;
  target_geography: string | null;
  current_year: number | null;
  expected_graduation_year: number | null;
  bank_targets: { name: string; priority: number; status: string }[];
  timeline: RecruitingCycle[];
  timeline_last_reviewed: string;
}

export interface RoadmapItem {
  title: string;
  detail: string;
}

export interface RoadmapSections {
  this_week: RoadmapItem[];
  next_30_days: RoadmapItem[];
  next_90_days: RoadmapItem[];
  before_apps_open: RoadmapItem[];
}

export interface RoadmapResult {
  sections: RoadmapSections;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export const ROADMAP_SECTION_KEYS = [
  'this_week',
  'next_30_days',
  'next_90_days',
  'before_apps_open',
] as const;

function isRoadmapItem(value: unknown): value is RoadmapItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.title === 'string' && v.title.length > 0 && typeof v.detail === 'string';
}

function isRoadmapSections(value: unknown): value is RoadmapSections {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ROADMAP_SECTION_KEYS.every(
    (key) => Array.isArray(v[key]) && (v[key] as unknown[]).length > 0 && (v[key] as unknown[]).every(isRoadmapItem),
  );
}

export async function generateRoadmap(input: RoadmapInput): Promise<RoadmapResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new RoadmapError('OPENAI_API_KEY is not set');
  }

  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: MAX_RETRIES });

  let response;
  try {
    response = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1536,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildRoadmapSystemPrompt() },
        { role: 'user', content: buildRoadmapUserMessage(input) },
      ],
    });
  } catch (err) {
    throw new RoadmapError(`OpenAI request failed (model: ${MODEL})`, err);
  }

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new RoadmapError('Empty response from OpenAI API');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new RoadmapError(
      `Model returned non-JSON output. First 300 chars: ${text.slice(0, 300)}`,
    );
  }

  if (!isRoadmapSections(parsed)) {
    throw new RoadmapError('Response missing one or more required roadmap sections');
  }

  return {
    sections: parsed,
    model: MODEL,
    usage: {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
    },
  };
}
