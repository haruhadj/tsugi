"use client";

import { ChevronDownIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * The rundown's sort, as a bottom drawer instead of a chip rail. On a phone the
 * four sorts do not fit the sticky band beside the browse trigger without
 * scrolling sideways, and a sideways scroll hides the very options it holds —
 * so what the band shows is the sort you are *in*, and the choices open over the
 * feed where all four are visible at once.
 *
 * Only for phones: from `md` the chip rail fits outright and FeedList renders it
 * instead, so this trigger is hidden there.
 *
 * The options themselves are `Link`s built by the server page — same hrefs the
 * chips use — and handed down as children, so nothing about the URL shape has to
 * cross into the client bundle.
 */
export function FeedSortDrawer({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden">
        <span className="text-muted-foreground">Sort:</span>
        {label}
        <ChevronDownIcon className="size-3.5 text-muted-foreground" aria-hidden />
      </SheetTrigger>

      <SheetContent side="bottom" className="gap-0 rounded-t-2xl">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-display tracking-[-0.01em]">Sort</SheetTitle>
        </SheetHeader>

        {/*
          A click delegate, the same one FeedBrowseDrawer uses: the children are
          real links, and a client-side navigation would otherwise leave this
          drawer open over the feed it just re-sorted.
        */}
        <div onClick={() => setOpen(false)} className="flex flex-col gap-1 p-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
