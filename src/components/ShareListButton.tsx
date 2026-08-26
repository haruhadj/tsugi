"use client";

import { Share2Icon } from "lucide-react";
import { useState } from "react";
import { ShareModal } from "@/components/ShareModal";
import { Button } from "@/components/ui/button";
import type { SocialCardInput } from "@/lib/canvasExport";
import { cn } from "@/lib/utils";

/**
 * The card action bar's icon-only pill (used on feed rows) — see
 * `ShareListButton`'s `variant="pill"`. An icon-only circle on a phone, and
 * a quiet text button from `md` up, where the row sits inside a bordered card.
 */
const PILL_CLASSNAME = cn(
  "inline-flex size-9 items-center justify-center gap-1.5 rounded-full border border-border bg-secondary/40 text-xs font-medium",
  "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
  "md:size-auto md:border-transparent md:bg-transparent md:px-2 md:py-1",
);

/**
 * The share entry point, in two shapes sharing one `ShareModal`.
 *
 * `variant="button"` (default) is the labeled button used on /r/[slug], where
 * `markdown` and `card` are built server-side alongside the list.
 *
 * `variant="pill"` is the icon-only pill used on feed rows, where only the
 * URL and title are known — a feed row has no resolved titles for
 * `SocialCardInput`, and `ShareModal` already treats `markdown`/`card` as
 * optional for exactly that half-known state.
 */
export function ShareListButton({
  url,
  text,
  markdown,
  card,
  variant = "button",
  className,
}: {
  url: string;
  text?: string;
  markdown?: string;
  card?: SocialCardInput;
  variant?: "button" | "pill";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(PILL_CLASSNAME, className)}
        >
          <Share2Icon className="size-3.5" aria-hidden />
          <span className="sr-only md:not-sr-only">Share</span>
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className={cn("rounded-full", className)}
          onClick={() => setOpen(true)}
        >
          <Share2Icon aria-hidden />
          Share
        </Button>
      )}
      <ShareModal
        open={open}
        onOpenChange={setOpen}
        url={url}
        text={text}
        markdown={markdown}
        card={card}
      />
    </>
  );
}
