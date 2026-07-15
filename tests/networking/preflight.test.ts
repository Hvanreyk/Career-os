import { describe, expect, it } from 'vitest';
import { preflightPasses, runPreflight } from '../../lib/networking/preflight.js';

const base = {
  channel: 'email' as const,
  purpose: 'cold_intro' as const,
  subject: 'Quick question about your path into IB',
  body: 'Hi Jane, I noticed we both studied at UNSW. Would you have 15 minutes for a call in the next two weeks?',
  ask: '15 minute call',
  hasRecipientEmail: true,
};

describe('runPreflight', () => {
  it('passes a clean message', () => {
    expect(preflightPasses(runPreflight(base))).toBe(true);
  });

  it('blocks an empty body', () => {
    const issues = runPreflight({ ...base, body: '   ' });
    expect(issues[0]).toMatchObject({ code: 'empty_body', severity: 'block' });
  });

  it('blocks leftover placeholder text', () => {
    const issues = runPreflight({ ...base, body: 'Hi [Name], would you have time?' });
    expect(issues.some((i) => i.code === 'placeholder_text' && i.severity === 'block')).toBe(true);
  });

  it('blocks an email message with no recipient email on the contact', () => {
    const issues = runPreflight({ ...base, hasRecipientEmail: false });
    expect(issues.some((i) => i.code === 'missing_recipient' && i.severity === 'block')).toBe(true);
  });

  it('blocks an over-length LinkedIn connection note', () => {
    const issues = runPreflight({
      ...base, channel: 'linkedin', purpose: 'linkedin_connection', body: 'x'.repeat(301),
    });
    expect(issues.some((i) => i.code === 'connection_note_too_long' && i.severity === 'block')).toBe(true);
  });

  it('blocks shortened links', () => {
    const issues = runPreflight({ ...base, body: `${base.body} See https://bit.ly/abc123` });
    expect(issues.some((i) => i.code === 'shortened_link' && i.severity === 'block')).toBe(true);
  });

  it('warns (not blocks) on a missing subject', () => {
    const issues = runPreflight({ ...base, subject: '' });
    const issue = issues.find((i) => i.code === 'missing_subject');
    expect(issue?.severity).toBe('warn');
    expect(preflightPasses(issues)).toBe(true);
  });

  it('warns on an empty ask for a cold intro', () => {
    const issues = runPreflight({ ...base, ask: '' });
    expect(issues.some((i) => i.code === 'empty_ask' && i.severity === 'warn')).toBe(true);
  });

  it('sorts blocking issues before warnings', () => {
    const issues = runPreflight({ ...base, subject: '', body: 'Hi [Name]' });
    expect(issues[0].severity).toBe('block');
  });
});
