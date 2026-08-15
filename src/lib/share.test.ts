import { describe, expect, test } from "bun:test";
import { buildDiscordMessage, buildWhatsAppShareUrl, buildXShareUrl } from "./share";

const LINK = "https://tsugi.app/r/abc123";

describe("buildXShareUrl", () => {
  // Criterion 26.
  test("contains the link as the url param", () => {
    const result = buildXShareUrl(LINK);
    const params = new URL(result).searchParams;
    expect(params.get("url")).toBe(LINK);
  });

  test("includes optional text alongside the link", () => {
    const result = buildXShareUrl(LINK, "check this out");
    const params = new URL(result).searchParams;
    expect(params.get("text")).toBe("check this out");
    expect(params.get("url")).toBe(LINK);
  });

  test("omits text param entirely when no text is given", () => {
    const result = buildXShareUrl(LINK);
    expect(new URL(result).searchParams.has("text")).toBe(false);
  });

  test("uses the canonical x.com intent endpoint, not the legacy twitter.com one", () => {
    const result = buildXShareUrl(LINK);
    expect(result.startsWith("https://x.com/intent/post?")).toBe(true);
  });
});

describe("buildWhatsAppShareUrl", () => {
  // Criterion 26 — the specific failure this guards: WhatsApp has no separate
  // `url` param, so the link must be encoded inside `text` or it silently vanishes.
  test("embeds the link inside the text param, since wa.me has no url param", () => {
    const result = buildWhatsAppShareUrl(LINK);
    const params = new URL(result).searchParams;
    expect(params.has("url")).toBe(false);
    expect(params.get("text")).toContain(LINK);
  });

  test("prepends optional text before the link inside the combined text param", () => {
    const result = buildWhatsAppShareUrl(LINK, "check this out");
    const params = new URL(result).searchParams;
    expect(params.get("text")).toBe(`check this out ${LINK}`);
  });

  test("uses the wa.me endpoint", () => {
    const result = buildWhatsAppShareUrl(LINK);
    expect(result.startsWith("https://wa.me/?")).toBe(true);
  });
});

describe("buildDiscordMessage", () => {
  test("is just the url when no text is given", () => {
    expect(buildDiscordMessage(LINK)).toBe(LINK);
  });

  test("prepends text before the link when given", () => {
    expect(buildDiscordMessage(LINK, "check this out")).toBe(`check this out ${LINK}`);
  });
});
