/**
 * Generates a clean 12-character URL-friendly slug
 * Format: tsu-XXXX-YYYY (where XXXX and YYYY are lowercase alphanumeric chars)
 */
export function generateSlug(): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz'; // unambiguous chars
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `tsu-${p1}-${p2}`;
}
