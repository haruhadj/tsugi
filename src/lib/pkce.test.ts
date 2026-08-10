import { describe, expect, test } from "bun:test";
import { sha256Base64Url } from "./pkce";

describe("sha256Base64Url", () => {
  // The official RFC 7636 Appendix B test vector.
  test("matches the RFC 7636 S256 test vector", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await sha256Base64Url(verifier);
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});
