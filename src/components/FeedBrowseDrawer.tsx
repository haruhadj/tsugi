"use client";

import { MenuIcon } from "lucide-react";
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
  useState,
} from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH_OPEN = "17rem"; // 272px
const SIDEBAR_WIDTH_COLLAPSED = "4rem"; // 64px

/**
 * Shared open state between the rail's own toggle and anything else that
 * ever needs to flip it. The rail shrinks rather than disappearing, so
 * "open" here means "expanded", not "mounted" — the sidebar is always in
 * the grid. Only meaningful from `md` up: below that the directory has no
 * rail at all, just the sheet below.
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
 * The grid that gives the sidebar its own track — from `md` up only. A phone
 * has no room to spare on a permanent rail, collapsed or not, so below `md`
 * this is a single column and the directory moves into the sheet
 * `FeedBrowseSidebar` renders for that width instead.
 */
export function FeedBrowseProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <FeedBrowseContext.Provider value={{ open, setOpen }}>
      <div
        className="grid grid-cols-1 transition-[grid-template-columns] duration-200 ease-in-out md:grid-cols-[var(--sidebar-width)_1fr]"
        style={
          {
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
 * The mobile form of the directory: a bottom-anchored sheet instead of a
 * rail, matching `FeedSortDrawer`'s shape. `FeedPage` places it in the title
 * row, standing in for the "The rundown" heading on a phone — there is no
 * spare width there for both, and a rail's job (getting to the directory) is
 * worth more than a heading the page's own URL already announces.
 *
 * `iconOnly` drops the "Browse" label and the pill chrome for that slot: a
 * bare hamburger glyph, the minimal form the title row has room for.
 */
export function FeedBrowseMobileTrigger({
  children,
  filtered = false,
  iconOnly = false,
}: {
  children: ReactNode;
  filtered?: boolean;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Browse the rundown"
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden",
          iconOnly
            ? "size-9"
            : "min-h-9 gap-1.5 border border-border bg-secondary/40 px-3 text-xs font-medium",
        )}
      >
        <MenuIcon className="size-4" aria-hidden />
        {!iconOnly && "Browse"}
        {filtered && (
          <span
            aria-hidden
            className="absolute top-0 right-0 size-1.5 rounded-full bg-primary"
          />
        )}
      </SheetTrigger>

      <SheetContent side="left" className="w-[17rem] gap-0 p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="font-display tracking-[-0.01em]">
            Browse
          </SheetTitle>
        </SheetHeader>
        {/*
          A click delegate, the same one the sort drawer uses: the
          directory's categories and genres are real `Link`s, and a
          client-side navigation would otherwise leave this sheet open
          over the feed it just filtered.
        */}
        <div
          onClick={() => setOpen(false)}
          className="flex flex-col gap-4 overflow-y-auto p-4"
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The rundown's directory as a persistent rail, from `md` up only. A phone
 * has no room to spare on a permanent rail, collapsed or not, so below `md`
 * this renders nothing — the same `children` reach a phone through
 * `FeedBrowseMobileTrigger` instead, placed wherever the sort controls are.
 *
 * Collapsing the rail shrinks its track to a 64px sliver instead of removing
 * it from the grid, so the toggle stays put and the feed column recenters
 * itself through the grid's own `1fr` track rather than a width recalculated
 * by hand.
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
      className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-border md:block"
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
