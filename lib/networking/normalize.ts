// ============================================================
// Identity normalisation for networking contacts.
//
// Normalised email / LinkedIn values are the owner-scoped unique
// keys in networking_contacts and drive duplicate classification
// during CSV import. Pure module — no I/O.
// ============================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Normalises an email address for storage and duplicate matching.
 *
 * @param raw - The email as entered by the student
 * @returns The lowercased, trimmed address, or null when the value is
 *   empty or not a plausible address
 */
export function normalizeEmail(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return null;
  return value;
}

/**
 * Normalises a LinkedIn profile URL to a canonical form.
 *
 * Accepts bare slugs ("in/jane-doe"), missing protocols, regional
 * subdomains (au.linkedin.com), query strings and trailing slashes.
 *
 * @param raw - The URL or fragment as entered by the student
 * @returns `https://www.linkedin.com/in/<slug>` (slug lowercased), or
 *   null when the value is empty or not a personal profile URL
 */
export function normalizeLinkedinUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  value = value.replace(/^https?:\/\//i, '');
  value = value.replace(/^([a-z]{2,3}\.)?(www\.)?linkedin\.com\//i, '');
  value = value.replace(/^\/+/, '');
  const match = value.match(/^in\/([A-Za-z0-9\-_%.]+)/);
  if (!match || !match[1]) return null;
  const slug = match[1].replace(/\/+$/, '').toLowerCase();
  if (!slug || slug.length > 120) return null;
  return `https://www.linkedin.com/in/${slug}`;
}

/**
 * Normalises a name+firm pair for weak duplicate matching during import.
 *
 * @param fullName - The contact's full name
 * @param firm - The contact's firm (may be empty)
 * @returns A lowercase whitespace-collapsed `name|firm` key
 */
export function nameFirmKey(fullName: string, firm: string): string {
  const clean = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${clean(fullName)}|${clean(firm)}`;
}
