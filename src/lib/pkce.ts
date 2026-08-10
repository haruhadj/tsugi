// RFC 7636's S256 code_challenge derivation: BASE64URL(SHA256(verifier)), no
// padding. Used by MAL's PKCE workaround in auth.ts — see the comment there
// for why a "plain"-only provider needs this computed manually (D30).
export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("base64url");
}
