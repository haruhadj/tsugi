import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/** Drag distance, in CSS pixels, that arms a refresh. */
export const PULL_THRESHOLD = 64;

/**
 * Drag down at the top of the feed to reload it.
 *
 * Listens on `window` rather than on a container because the scroll being
 * overscrolled is the document's. The trade this makes is recorded in
 * `globals.css`: `overscroll-behavior-y: contain` has to be set on the body for
 * the browser's own pull-to-refresh not to fire alongside this one, which means
 * the native gesture is gone and this is now the only one.
 */
export function usePullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  // `router.refresh()` returns nothing to await — it resolves by re-rendering
  // the server component. Wrapping it in a transition is how its progress
  // becomes readable: `isPending` stays true until the new tree is committed,
  // which is precisely "the refresh is still running".
  const [refreshing, startRefresh] = useTransition();
  const pullRef = useRef(0);

  useEffect(() => {
    // The drag readout is decoration; the refresh is the function. Under
    // reduced motion the gesture still works, it just does not animate, so the
    // listeners stay attached and only the indicator's height is pinned at 0.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let startY: number | null = null;

    function begin(event: TouchEvent) {
      startY = window.scrollY <= 0 ? (event.touches[0]?.clientY ?? null) : null;
    }

    function move(event: TouchEvent) {
      if (startY === null) return;

      const current = event.touches[0]?.clientY;
      if (current === undefined) return;

      const delta = current - startY;
      // Scrolling up, or the page has scrolled away from the top mid-gesture:
      // this was a scroll, not a pull. Release it back to the browser.
      if (delta <= 0 || window.scrollY > 0) {
        startY = null;
        pullRef.current = 0;
        setPull(0);
        return;
      }

      // Only safe because the document is already at scrollTop 0 and the drag
      // is downward — there is no scrolling this cancels, only the rubber-band.
      event.preventDefault();
      // Damped, so the indicator trails the thumb the way a physical pull does
      // and the threshold takes a deliberate drag rather than a flick.
      pullRef.current = Math.min(delta * 0.5, PULL_THRESHOLD * 1.5);
      setPull(reduced ? 0 : pullRef.current);
    }

    function end() {
      if (startY === null) return;
      startY = null;

      if (pullRef.current >= PULL_THRESHOLD) {
        startRefresh(() => router.refresh());
      }
      pullRef.current = 0;
      setPull(0);
    }

    // `move` must be non-passive to be allowed to preventDefault, which is why
    // these are attached by hand instead of as React props — React registers
    // touch handlers passively.
    window.addEventListener("touchstart", begin, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", end, { passive: true });

    return () => {
      window.removeEventListener("touchstart", begin);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, [router, startRefresh]);

  return { pull, refreshing };
}
