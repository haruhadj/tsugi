import { useEffect, useRef, useState } from "react";

/** Scroll distance, in CSS pixels, before a direction change counts — small
 * jitter (a bounce, a sub-pixel wheel tick) should not toggle the bars. */
const SCROLL_HIDE_THRESHOLD = 8;

/**
 * True once the reader has scrolled down past the bars' own height, false
 * on any scroll back up — the up-swipe that reveals the bars again is also
 * the gesture readers already use to go looking for the top of the page, so
 * it doubles as "show me the chrome".
 *
 * Only meaningful on a phone: the desktop header does not hide (see the
 * `md:` override where this is applied), so nothing here needs to run
 * differently by width — a `md`-width reader just never triggers a large
 * enough scroll delta to flip it before landing back near the top.
 */
export function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;

      // Near the top, always shown — hiding the way back to the very
      // content the bars navigate would be self-defeating.
      if (y < 64) {
        setHidden(false);
      } else if (Math.abs(delta) > SCROLL_HIDE_THRESHOLD) {
        setHidden(delta > 0);
      }

      lastY.current = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}
