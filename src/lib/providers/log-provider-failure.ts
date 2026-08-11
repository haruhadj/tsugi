import type { Provider, ProviderResult } from "@/lib/types/media";

/**
 * One log line per provider failure, naming the provider, the reason, and
 * elapsed time (code-standards.md) — Jikan fails often enough that this is
 * the only way to tell its outages from ours. `console.warn` rather than a
 * logging library: it runs in both the browser adapter and the server
 * service, and nothing in tech-stack.md has approved one.
 */
export function logProviderFailure(
  provider: Provider,
  operation: "search" | "resolve",
  result: ProviderResult<unknown>,
  elapsedMs: number,
): void {
  if (result.ok) return;
  console.warn(
    `[provider:${provider}] ${operation} failed: ${result.reason} (${Math.round(elapsedMs)}ms)`,
  );
}
