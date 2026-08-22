"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * The AniList-style strip: a thin gradient bar across the very top of the
 * viewport that races toward (never reaching) completion while a navigation
 * is in flight, then snaps to full and fades. The App Router gives us no
 * "navigation started" event, so this listens for the same clicks Next's own
 * <Link> does — a left-click, no modifier keys, on an in-app anchor — and
 * treats a pathname/search-param change as the signal the navigation landed.
 */
export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start() {
    if (intervalRef.current) return;
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    setVisible(true);
    setProgress(12);

    // Eases toward 90% and stalls there — actual completion is signalled by
    // the route change effect below, not by this timer running out.
    intervalRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 90) return current;
        const remaining = 90 - current;
        return current + remaining * 0.1;
      });
    }, 200);
  }

  function finish() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(100);
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      // Only same-origin, in-app links trigger the bar — an external href
      // navigates the whole page away, which the browser already shows
      // progress for.
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }
      } catch {
        return;
      }

      start();
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Fires once the new route has actually rendered, which is the only
  // reliable "navigation finished" signal the App Router exposes here.
  useEffect(() => {
    const timeout = setTimeout(finish, 0);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="brand-gradient h-full shadow-[0_0_8px_var(--primary)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
