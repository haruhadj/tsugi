"use client";

import { MenuIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * The rundown's directory — categories, genres, and the About panel — as a drawer
 * instead of a column beside the feed. The feed rows carry a filmstrip of covers
 * whose size is whatever horizontal space is left over, so a permanent 18rem
 * sidebar was being paid for out of the covers.
 *
 * The panels themselves are rendered by the server page and handed down as
 * children: they are nothing but `Link`s, and building them here would pull the
 * whole directory — and its counts — into the client bundle for no gain.
 *
 * `filtered` only decorates the trigger. What is actually filtering stays spelled
 * out in the filter bar on the page, so the dot is never the only signal.
 */
export function FeedBrowseDrawer({
  children,
  filtered = false,
}: {
  children: ReactNode;
  filtered?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <MenuIcon className="size-3.5" aria-hidden />
        Browse
        {filtered && (
          <>
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            <span className="sr-only">(filters active)</span>
          </>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full gap-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-display tracking-[-0.01em]">Browse</SheetTitle>
          <SheetDescription>
            Narrow the rundown to a category or a genre.
          </SheetDescription>
        </SheetHeader>

        {/*
          A click delegate, not a control: every child is a real `Link`, and a
          client-side navigation leaves this drawer mounted and open over the page
          it just changed. Keyboard activation of a link fires a click too, so this
          closes for pointer and keyboard alike without touching the links.
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
