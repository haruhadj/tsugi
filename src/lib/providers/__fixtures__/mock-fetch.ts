/**
 * Builds a `fetch`-shaped function from a recorded fixture, for the
 * injectable-`fetch` seam (code-standards.md). Not a `.test.ts` file itself —
 * lives beside the fixtures it serves rather than duplicated per test file.
 *
 * Every mock here honours `init.signal` the way real `fetch` does — rejects
 * immediately if already aborted, rejects when it fires later — because the
 * adapters' own timeout/cancellation behaviour is built entirely on that
 * contract. A mock that ignored `signal` would make the timeout and
 * abort-honouring tests pass or fail for the wrong reason.
 */
function abortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

function rejectOnAbort(
  signal: AbortSignal | null | undefined,
  reject: (reason: unknown) => void,
): void {
  if (!signal) return;
  if (signal.aborted) {
    reject(abortError());
    return;
  }
  signal.addEventListener("abort", () => reject(abortError()), { once: true });
}

export function mockFetchJSON(body: unknown, status = 200): typeof fetch {
  return (async (_url: string, init?: RequestInit) => {
    if (init?.signal?.aborted) throw abortError();
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

export function mockFetchReject(name: "AbortError" | "TypeError" = "TypeError"): typeof fetch {
  return (async () => {
    if (name === "AbortError") throw abortError();
    throw new TypeError("Failed to fetch");
  }) as unknown as typeof fetch;
}

/** Never resolves on its own — used to prove criterion 9's 6s timeout ceiling actually fires. */
export function mockFetchHang(): typeof fetch {
  return ((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      rejectOnAbort(init?.signal, reject);
    })) as unknown as typeof fetch;
}

/** First call fails, second succeeds — proves the same-provider retry (Jikan). */
export function mockFetchFailThenSucceed(body: unknown): typeof fetch {
  let calls = 0;
  return (async (_url: string, init?: RequestInit) => {
    if (init?.signal?.aborted) throw abortError();
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ status: 504, message: "unavailable" }), {
        status: 504,
      });
    }
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
}

export function countCalls(fetchImpl: typeof fetch): { count: () => number; fetchImpl: typeof fetch } {
  let count = 0;
  const wrapped = (async (...args: Parameters<typeof fetch>) => {
    count += 1;
    return fetchImpl(...args);
  }) as unknown as typeof fetch;
  return { count: () => count, fetchImpl: wrapped };
}
