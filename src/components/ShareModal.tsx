"use client";

import { useEffect, useState } from "react";
import { CheckIcon, DownloadIcon, ImageIcon, Loader2Icon } from "lucide-react";
import { CopyIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { copySocialCard, downloadSocialCard, type SocialCardInput } from "@/lib/canvasExport";
import { buildDiscordMessage, buildWhatsAppShareUrl, buildXShareUrl } from "@/lib/share";

type CopyState = "pending" | "copied" | "failed";

/**
 * `card` and `markdown` are optional: the builder opens this modal the moment a list
 * is created, when it has the URL but not yet the resolved titles the card and the
 * markdown block need. Those tabs only appear once there is something to put in them.
 */
export function ShareModal({
  open,
  onOpenChange,
  url,
  text,
  markdown,
  card,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  text?: string;
  markdown?: string;
  card?: SocialCardInput;
}) {
  const [copyState, setCopyState] = useState<CopyState>("pending");
  const [discordCopyState, setDiscordCopyState] = useState<CopyState>("pending");
  const [markdownCopyState, setMarkdownCopyState] = useState<CopyState>("pending");
  const [cardState, setCardState] = useState<"idle" | "working" | "copied" | "failed">(
    "idle",
  );
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCopyState("pending");
      setDiscordCopyState("pending");
      setMarkdownCopyState("pending");
      setCardState("idle");
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!navigator.clipboard) {
      Promise.resolve().then(() => setCopyState("failed"));
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => setCopyState("copied"))
      .catch(() => setCopyState("failed"));
  }, [open, url]);

  const copyText = (value: string, set: (state: CopyState) => void) => {
    if (!navigator.clipboard) {
      set("failed");
      return;
    }
    navigator.clipboard
      .writeText(value)
      .then(() => set("copied"))
      .catch(() => set("failed"));
  };

  async function copyCard() {
    if (!card) return;
    setCardState("working");
    try {
      await copySocialCard(card);
      setCardState("copied");
    } catch {
      // Firefox and older Safari have no image clipboard at all; the download
      // button beside this one is the way through, so this is not an error state
      // that needs an alert.
      setCardState("failed");
    }
  }

  async function saveCard() {
    if (!card) return;
    setCardState("working");
    try {
      await downloadSocialCard(card, "tsugi-card.png");
      setCardState("idle");
    } catch {
      setCardState("failed");
    }
  }

  const extraTabs = Boolean(markdown) || Boolean(card);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Bottom sheet under `sm`, centred dialog above it (ui-rules.md § Modals).

        The width overrides are the load-bearing part. DialogContent's base sets
        `max-w-[calc(100%-2rem)]` for a centred dialog, and the sheet inherited it —
        so the "sheet" was a 1rem-inset panel with a squared-off bottom edge floating
        against the viewport bottom, which reads as a dialog that failed to centre
        rather than as a sheet. `max-w-none` and `inset-x-0` let it reach both edges;
        `translate-x-0` cancels the centring transform that goes with the base's
        `left-[50%]`. All four revert at `sm`.

        `rounded-t-3xl` is the artifact radius (ui-tokens.md: the share modal at sm
        and up) applied to the two corners a sheet actually has. `pb-rail` clears the
        tab bar the sheet is drawn over, plus the home indicator, so the last button
        is never a dead tap. `max-h`/`overflow-y-auto` matter on the Card tab, which
        is the tallest — a sheet that runs past the top of a short viewport cannot be
        scrolled back to its own header.
      */}
      <DialogContent
        className="
          inset-x-0 bottom-0 top-auto max-h-[85dvh] max-w-none translate-x-0 translate-y-0
          overflow-y-auto rounded-t-3xl rounded-b-none pb-[calc(1.5rem+var(--rail))]
          sm:inset-x-auto sm:bottom-auto sm:top-[50%] sm:left-[50%] sm:max-h-[85dvh] sm:max-w-lg
          sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl sm:pb-6
        "
      >
        <DialogHeader>
          <DialogTitle>Share your list</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="link">
          {extraTabs && (
            <TabsList className="w-full">
              <TabsTrigger value="link">Link</TabsTrigger>
              {markdown && <TabsTrigger value="markdown">Markdown</TabsTrigger>}
              {card && <TabsTrigger value="card">Card</TabsTrigger>}
            </TabsList>
          )}

          <TabsContent value="link" className="flex flex-col gap-4">
            <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
              {copyState === "copied" && "Link copied!"}
              {copyState === "failed" && "Copy your link"}
            </div>
            <div className="flex flex-row gap-2">
              <Input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                aria-label="List link"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => copyText(url, setCopyState)}
                aria-label="Copy link"
              >
                {copyState === "copied" ? (
                  <CheckIcon aria-hidden="true" />
                ) : (
                  <CopyIcon aria-hidden="true" />
                )}
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild type="button" variant="secondary" className="flex-1">
                <a href={buildXShareUrl(url, text)} target="_blank" rel="noopener noreferrer">
                  Share to X
                </a>
              </Button>
              <Button asChild type="button" variant="secondary" className="flex-1">
                <a
                  href={buildWhatsAppShareUrl(url, text)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Share to WhatsApp
                </a>
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => copyText(buildDiscordMessage(url, text), setDiscordCopyState)}
              >
                {discordCopyState === "copied" ? "Message copied" : "Copy for Discord"}
              </Button>
            </div>
            <div role="status" aria-live="polite" className="sr-only">
              {discordCopyState === "copied" && "Discord message copied to clipboard"}
            </div>
            <a href={url} className="text-sm text-muted-foreground underline underline-offset-4">
              View it
            </a>
          </TabsContent>

          {markdown && (
            <TabsContent value="markdown" className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                For a forum post or anywhere the link preview will not render.
              </p>
              <Textarea
                readOnly
                value={markdown}
                rows={9}
                onFocus={(e) => e.target.select()}
                aria-label="Markdown export"
                className="resize-none font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => copyText(markdown, setMarkdownCopyState)}
              >
                {markdownCopyState === "copied" ? (
                  <CheckIcon aria-hidden />
                ) : (
                  <CopyIcon aria-hidden />
                )}
                {markdownCopyState === "copied" ? "Copied" : "Copy markdown"}
              </Button>
            </TabsContent>
          )}

          {card && (
            <TabsContent value="card" className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                The same 1200×630 card the link unfurls into, as a file you can post
                yourself.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={cardState === "working"}
                  onClick={copyCard}
                >
                  {cardState === "working" ? (
                    <Loader2Icon className="animate-spin" aria-hidden />
                  ) : cardState === "copied" ? (
                    <CheckIcon aria-hidden />
                  ) : (
                    <ImageIcon aria-hidden />
                  )}
                  {cardState === "copied" ? "Image copied" : "Copy image"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  disabled={cardState === "working"}
                  onClick={saveCard}
                >
                  <DownloadIcon aria-hidden />
                  Download PNG
                </Button>
              </div>
              <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
                {cardState === "failed" &&
                  "This browser cannot copy images — use Download PNG instead."}
              </p>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
