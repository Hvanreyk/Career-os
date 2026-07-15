// Runtime trust boundary for POST /api/generate-report. The schema lives in
// the shared core package so UI, server derivation, and scoring use one Zod
// instance and one Career Compass identifier registry.

export {
  CareerCompassOnboardDataSchema as OnboardDataSchema,
  type CareerCompassOnboardData as OnboardDataParsed,
} from '@trajectoryos/core/career-compass/taxonomy';
