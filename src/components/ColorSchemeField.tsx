"use client";

import { CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_PALETTE, PALETTE_COOKIE, PALETTES, type PaletteId, isPaletteId } from "@/lib/palette";

// Per-browser, not per-account: stored in a plain (non-httpOnly) cookie so the
// no-flash script in RootLayout can read it before React hydrates. Applying a
// scheme is instant and local — there is no server round-trip, so there is
// nothing to fail or to gate behind a session.
export function ColorSchemeField() {
  const [active, setActive] = useState<PaletteId>(DEFAULT_PALETTE);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-palette");
    if (current && isPaletteId(current)) {
      // Runs once on mount to reconcile with the pre-hydration inline script
      // (RootLayout) — the render-time default and this corrected value are
      // never the same paint, so no cascading-render cost applies.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(current);
    }
  }, []);

  function choose(id: PaletteId) {
    setActive(id);
    if (id === DEFAULT_PALETTE) {
      document.documentElement.removeAttribute("data-palette");
    } else {
      document.documentElement.setAttribute("data-palette", id);
    }
    // Cookie write, not React state — the linter's immutability rule doesn't
    // apply to this external system.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `${PALETTE_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {PALETTES.map((palette) => (
        <button
          key={palette.id}
          type="button"
          onClick={() => choose(palette.id)}
          aria-pressed={active === palette.id}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
            active === palette.id
              ? "border-primary/60 bg-card"
              : "border-border bg-card/40 hover:bg-card",
          )}
        >
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundImage: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.highlight} 100%)`,
            }}
          >
            {active === palette.id ? (
              <CheckIcon className="size-3 text-white drop-shadow-sm" aria-hidden />
            ) : null}
          </span>
          {palette.label}
        </button>
      ))}
    </div>
  );
}
