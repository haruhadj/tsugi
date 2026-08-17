"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildDiscordMessage, buildWhatsAppShareUrl, buildXShareUrl } from "@/lib/share";

type CopyState = "pending" | "copied" | "failed";

export function ShareModal({
  open,
  onOpenChange,
  url,
  text,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  text?: string;
}) {
  const [copyState, setCopyState] = useState<CopyState>("pending");
  const [discordCopyState, setDiscordCopyState] = useState<CopyState>("pending");
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCopyState("pending");
      setDiscordCopyState("pending");
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

  const handleCopy = () => {
    if (!navigator.clipboard) {
      setCopyState("failed");
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => setCopyState("copied"))
      .catch(() => setCopyState("failed"));
  };

  const handleDiscordCopy = () => {
    if (!navigator.clipboard) {
      setDiscordCopyState("failed");
      return;
    }
    navigator.clipboard
      .writeText(buildDiscordMessage(url, text))
      .then(() => setDiscordCopyState("copied"))
      .catch(() => setDiscordCopyState("failed"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 top-auto translate-y-0 rounded-b-none sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Share your list</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {copyState === "copied" && "Link copied!"}
            {copyState === "failed" && "Copy your link"}
          </div>
          <div className="flex flex-row gap-2">
            <Input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="List link" />
            <Button type="button" variant="outline" onClick={handleCopy} aria-label="Copy link">
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
              <a href={buildWhatsAppShareUrl(url, text)} target="_blank" rel="noopener noreferrer">
                Share to WhatsApp
              </a>
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={handleDiscordCopy}>
              {discordCopyState === "copied" ? "Message copied" : "Copy for Discord"}
            </Button>
          </div>
          <div role="status" aria-live="polite" className="sr-only">
            {discordCopyState === "copied" && "Discord message copied to clipboard"}
          </div>
          <a href={url} className="text-sm text-muted-foreground underline underline-offset-4">
            View it
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
