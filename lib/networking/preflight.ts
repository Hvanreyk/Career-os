import type { MessageChannel, MessagePurpose } from './types';

// ============================================================
// Deterministic message preflight — cheap, explainable checks that
// run before any AI review or send. Blocks are hard stops (the
// message would embarrass the student); warnings are advisory.
// Pure module — no I/O.
// ============================================================

export type PreflightSeverity = 'block' | 'warn';

export interface PreflightIssue {
  code: string;
  severity: PreflightSeverity;
  message: string;
}

export interface PreflightInput {
  channel: MessageChannel;
  purpose: MessagePurpose;
  subject: string;
  body: string;
  ask: string;
  hasRecipientEmail: boolean;
}

/** LinkedIn connection notes are hard-capped by LinkedIn itself. */
export const LINKEDIN_CONNECTION_NOTE_MAX = 300;
/** Above this, a cold email stops being a courtesy and starts being homework. */
export const COLD_EMAIL_SOFT_MAX = 1200;

const PLACEHOLDER_PATTERN = /\[[^\]]{0,60}\]|\{\{[^}]*\}\}|<(?:name|firm|company|role|insert)[^>]*>|\bTODO\b|\bXXX\b/i;
const URL_PATTERN = /https?:\/\/[^\s)>\]]+/gi;
const SHORTENER_HOSTS = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'rb.gy'];

/**
 * Runs deterministic checks on a saved draft.
 *
 * @returns Issues ordered blocks-first. An empty array means clear to
 *   review or send.
 */
export function runPreflight(input: PreflightInput): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const body = input.body.trim();

  if (!body) {
    issues.push({ code: 'empty_body', severity: 'block', message: 'The message body is empty.' });
    return issues;
  }

  if (PLACEHOLDER_PATTERN.test(body) || PLACEHOLDER_PATTERN.test(input.subject)) {
    issues.push({
      code: 'placeholder_text',
      severity: 'block',
      message: 'The message still contains placeholder text (e.g. [name], {{firm}}, TODO). Replace it before sending.',
    });
  }

  if (input.channel === 'email' && !input.hasRecipientEmail) {
    issues.push({
      code: 'missing_recipient',
      severity: 'block',
      message: 'This contact has no email address saved. Add one, or switch to the LinkedIn channel.',
    });
  }

  if (input.channel === 'linkedin' && input.purpose === 'linkedin_connection' && body.length > LINKEDIN_CONNECTION_NOTE_MAX) {
    issues.push({
      code: 'connection_note_too_long',
      severity: 'block',
      message: `LinkedIn connection notes are limited to ${LINKEDIN_CONNECTION_NOTE_MAX} characters (currently ${body.length}).`,
    });
  }

  if (input.channel === 'email' && !input.subject.trim()) {
    issues.push({
      code: 'missing_subject',
      severity: 'warn',
      message: 'Emails without a subject line are often skimmed past or filtered. Add a short, specific one.',
    });
  }

  if (input.purpose === 'cold_intro' && body.length > COLD_EMAIL_SOFT_MAX) {
    issues.push({
      code: 'cold_email_long',
      severity: 'warn',
      message: `A cold email this long (${body.length} characters) is unlikely to be read in full. Aim for under ${COLD_EMAIL_SOFT_MAX}.`,
    });
  }

  if (
    (input.purpose === 'cold_intro' || input.purpose === 'referral_request' || input.purpose === 'intro_request')
    && !input.ask.trim()
  ) {
    issues.push({
      code: 'empty_ask',
      severity: 'warn',
      message: 'You have not stated an ask. A reader should know exactly what you are hoping for.',
    });
  }

  const urls = body.match(URL_PATTERN) ?? [];
  for (const url of urls) {
    const lower = url.toLowerCase();
    if (lower.startsWith('http://')) {
      issues.push({
        code: 'insecure_link',
        severity: 'warn',
        message: `The link ${url} uses http://, which looks untrustworthy in outreach. Use https.`,
      });
    }
    if (SHORTENER_HOSTS.some((host) => lower.includes(`//${host}/`) || lower.includes(`.${host}/`))) {
      issues.push({
        code: 'shortened_link',
        severity: 'block',
        message: `Shortened links (${url}) look like spam to bankers and mail filters. Link directly or drop it.`,
      });
    }
  }

  if ((body.match(/!/g) ?? []).length >= 3) {
    issues.push({
      code: 'excessive_exclamation',
      severity: 'warn',
      message: 'Multiple exclamation marks read as overeager. One at most.',
    });
  }

  issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'block' ? -1 : 1));
  return issues;
}

/** True when no blocking issue is present. */
export function preflightPasses(issues: PreflightIssue[]): boolean {
  return !issues.some((issue) => issue.severity === 'block');
}
