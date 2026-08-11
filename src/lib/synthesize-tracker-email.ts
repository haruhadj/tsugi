const TRACKER_EMAIL_PATTERN = /^(anilist|mal)-\d+@users\.tsugi\.invalid$/;

/**
 * Neither AniList nor MAL returns an email (D25), so one is synthesised. A
 * hyphen, not a colon — `:` is not a valid unquoted RFC 5322 local part.
 * `.invalid` is reserved by RFC 2606 and can never be routed or registered,
 * so this can never collide with a real address. PHASE-2.md criterion 4
 * pins the exact shape; `TRACKER_EMAIL_PATTERN` here is that same pattern,
 * not a re-derivation of it.
 */
export function synthesizeTrackerEmail(provider: "anilist" | "mal", externalId: string): string {
  return `${provider}-${externalId}@users.tsugi.invalid`;
}

export function isSynthesizedTrackerEmail(email: string): boolean {
  return TRACKER_EMAIL_PATTERN.test(email);
}
