"use client";

import { MenuIcon } from "lucide-react";
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH_OPEN = "17rem"; // 272px
const SIDEBAR_WIDTH_COLLAPSED = "4rem"; // 64px

/**
 * Shared open state between the rail's own toggle and anything else that
 * ever needs to flip it. The rail shrinks rather than disappearing, so
 * "open" here means "expanded", not "mounted" — the sidebar is always in
 * the grid.
 */
const FeedBrowseContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

function useFeedBrowse() {
  const ctx = useContext(FeedBrowseContext);
  if (!ctx) {
    throw new Error(
      "FeedBrowseSidebar must be used within a FeedBrowseProvider",
    );
  }
  return ctx;
}

/**
 * The grid that gives the sidebar its own track. `--sidebar-width` is the
 * single source of truth for that track's size, so the rail's width, the
 * toggle's position, and the grid column all move together off one value
 * instead of three that could drift out of sync.
 */
export function FeedBrowseProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <FeedBrowseContext.Provider value={{ open, setOpen }}>
      <div
        className="grid transition-[grid-template-columns] duration-200 ease-in-out"
        style={
          {
            gridTemplateColumns: "var(--sidebar-width) 1fr",
            "--sidebar-width": open
              ? SIDEBAR_WIDTH_OPEN
              : SIDEBAR_WIDTH_COLLAPSED,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </FeedBrowseContext.Provider>
  );
}

/**
 * The rundown's directory as a persistent rail rather than a modal. Collapsing
 * it shrinks the track to a 64px rail instead of removing it from the grid, so
 * the toggle stays put and the feed column recenters itself through the grid's
 * own `1fr` track rather than a width recalculated by hand.
 */
export function FeedBrowseSidebar({
  children,
  filtered = false,
}: {
  children: ReactNode;
  filtered?: boolean;
}) {
  const { open, setOpen } = useFeedBrowse();

  return (
    <aside
      aria-label="Browse the rundown"
      /*
        Relative, not overflow-hidden: the toggle below is positioned against
        *this* box, half-overlapping its right edge. If the clipping and the
        scrolling both lived here, that overflow would crop the toggle along
        with everything else. The clip now belongs to the wrapper just below,
        which owns nothing but the collapse effect.
      */
      className="sticky top-16 h-[calc(100vh-4rem)] shrink-0 border-r border-border"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Collapse browse" : "Expand browse"}
        onClick={() => setOpen(!open)}
        className="absolute z-10 inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        style={{ top: "20px", right: "-16px" }}
      >
        <MenuIcon className="size-4" aria-hidden />
        {filtered && (
          <span
            aria-hidden
            className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary"
          />
        )}
      </button>

      {/* Owns only the collapse clip, so the scrollbar it makes room for
          below never has to share a stacking/clip context with the toggle. */}
      <div className="h-full overflow-hidden">
        <div
          className={cn(
            "flex h-full w-[17rem] flex-col gap-4 overflow-y-auto p-4 transition-opacity duration-200",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {children}
        </div>
      </div>
    </aside>
  );
}
