// ============================================================
// Identity normalisation for networking contacts.
//
// Normalised email / LinkedIn values are the owner-scoped unique
// keys in networking_contacts and drive duplicate classification
// during CSV import. Pure module — no I/O.
// ============================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Normalizes an email address for storage and duplicate matching.
 *
 * @param raw - The email address as entered by the user
 * @returns The lowercased, trimmed address, or `null` if the value is empty or invalid
 */
export function normalizeEmail(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return null;
  return value;
}

/**
 * Normalizes a LinkedIn personal profile URL to a canonical form.
 *
 * Accepts profile slugs, missing protocols, regional subdomains, query strings, and trailing slashes.
 *
 * @param raw - The entered URL or profile fragment
 * @returns The canonical profile URL, or `null` for empty or invalid values
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
 * Creates a weak duplicate-matching key from a contact's name and firm.
 *
 * @param fullName - The contact's full name
 * @param firm - The contact's firm
 * @returns A lowercase key containing the whitespace-collapsed name and firm separated by `|`
 */
export function nameFirmKey(fullName: string, firm: string): string {
  const clean = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${clean(fullName)}|${clean(firm)}`;
}
