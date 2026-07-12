export const RESOURCE_CAPABILITIES = [
  'lessons',
  'quizzes',
  'diagnostic',
  'bank-tracker',
  'roadmap',
  'resume-workshop',
  'contacts',
  'message-review',
  'question-bank',
  'story-bank',
  'mock-interview',
  'deal-workspace',
  'market-briefs',
  'watchlist',
] as const;

export type ResourceCapability = (typeof RESOURCE_CAPABILITIES)[number];
export type ResourceMode = 'learning' | 'workspace' | 'practice' | 'briefing';

export interface ResourceDefinition {
  slug: string;
  title: string;
  description: string;
  icon: string;
  tag: string;
  mode: ResourceMode;
  capabilities: readonly ResourceCapability[];
}

/**
 * Product-level resource registry.
 *
 * A published course supplies learning content, but this registry decides
 * which product capabilities are valid for each resource. Keep this explicit
 * while the catalogue is small: it prevents a new course from inheriting the
 * Investment Banking Guides diagnostic, tracker, or roadmap by accident.
 */
export const RESOURCE_CATALOG = [
  {
    slug: 'investment-banking-guides',
    icon: 'briefcase',
    title: 'Investment Banking Guides',
    description:
      'A structured career roadmap: what banks do, how deals work, the AU recruiting process, and a personalised plan — with a diagnostic and readiness score.',
    tag: 'Guides',
    mode: 'learning',
    capabilities: ['lessons', 'quizzes', 'diagnostic', 'bank-tracker', 'roadmap'],
  },
  {
    slug: 'resume-cover-letter',
    icon: 'mail',
    title: 'Resume & Cover Letter Tips',
    description:
      'Craft a finance resume that stands out. Learn what MDs and analysts actually look at, and how to present your experience with impact.',
    tag: 'Templates',
    mode: 'workspace',
    capabilities: ['lessons', 'quizzes', 'resume-workshop'],
  },
  {
    slug: 'networking-strategy',
    icon: 'users',
    title: 'Networking Strategy',
    description:
      'How to cold outreach bankers effectively, what to say in coffee chats, how to follow up, and how to convert conversations into referrals.',
    tag: 'Strategy',
    mode: 'workspace',
    capabilities: ['lessons', 'quizzes', 'contacts', 'message-review'],
  },
  {
    slug: 'interview-preparation',
    icon: 'mic',
    title: 'Interview Preparation',
    description:
      'Technical and behavioural interview prep tailored to IB. Accounting walk-throughs, DCF practice, LBO questions, and fit interview frameworks.',
    tag: 'Practice',
    mode: 'practice',
    capabilities: ['lessons', 'quizzes', 'question-bank', 'story-bank', 'mock-interview'],
  },
  {
    slug: 'deal-breakdown-templates',
    icon: 'pie-chart',
    title: 'Deal Breakdown Templates',
    description:
      'Structured frameworks for dissecting real transactions — the deal rationale, financing structure, valuation approach, and buyer logic.',
    tag: 'Templates',
    mode: 'workspace',
    capabilities: ['lessons', 'quizzes', 'deal-workspace'],
  },
  {
    slug: 'market-awareness',
    icon: 'globe',
    title: 'Market Awareness',
    description:
      'Stay up to date on M&A activity, capital markets trends, and deal flow. Build the commercial awareness interviewers expect.',
    tag: 'Intel',
    mode: 'briefing',
    capabilities: ['lessons', 'quizzes', 'market-briefs', 'watchlist'],
  },
] as const satisfies readonly ResourceDefinition[];

export type ResourceSlug = (typeof RESOURCE_CATALOG)[number]['slug'];

const RESOURCE_BY_SLUG = new Map<string, ResourceDefinition>(
  RESOURCE_CATALOG.map((resource) => [resource.slug, resource]),
);

export function getResourceDefinition(slug: string): ResourceDefinition | null {
  return RESOURCE_BY_SLUG.get(slug) ?? null;
}

export function resourceHasCapability(
  slugOrResource: string | ResourceDefinition,
  capability: ResourceCapability,
): boolean {
  const resource =
    typeof slugOrResource === 'string'
      ? getResourceDefinition(slugOrResource)
      : slugOrResource;
  return resource?.capabilities.includes(capability) ?? false;
}

