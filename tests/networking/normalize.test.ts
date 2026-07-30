import { describe, expect, it } from 'vitest';
import { nameFirmKey, normalizeEmail, normalizeLinkedinUrl } from '../../lib/networking/normalize.js';

describe('normalizeEmail', () => {
  it('lowercases and trims a valid address', () => {
    expect(normalizeEmail('  Jane.Doe@Example.COM  ')).toBe('jane.doe@example.com');
  });

  it('rejects malformed addresses', () => {
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail('')).toBeNull();
  });
});

describe('normalizeLinkedinUrl', () => {
  it('canonicalises full URLs, bare slugs and regional subdomains', () => {
    expect(normalizeLinkedinUrl('https://www.linkedin.com/in/jane-doe/')).toBe('https://www.linkedin.com/in/jane-doe');
    expect(normalizeLinkedinUrl('linkedin.com/in/Jane-Doe?trk=abc')).toBe('https://www.linkedin.com/in/jane-doe');
    expect(normalizeLinkedinUrl('au.linkedin.com/in/jane-doe')).toBe('https://www.linkedin.com/in/jane-doe');
    expect(normalizeLinkedinUrl('in/jane-doe')).toBe('https://www.linkedin.com/in/jane-doe');
  });

  it('rejects non-profile URLs', () => {
    expect(normalizeLinkedinUrl('https://www.linkedin.com/company/acme')).toBeNull();
    expect(normalizeLinkedinUrl('')).toBeNull();
  });
});

describe('nameFirmKey', () => {
  it('is case-insensitive and whitespace-collapsing', () => {
    expect(nameFirmKey('Jane   Doe', 'Macquarie')).toBe(nameFirmKey('jane doe', 'MACQUARIE'));
  });
});
