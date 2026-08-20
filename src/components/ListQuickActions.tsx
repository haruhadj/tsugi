"use client";

import { CheckIcon, CopyIcon, DownloadIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadSocialCard, type SocialCardInput } from "@/lib/canvasExport";
import { cn } from "@/lib/utils";

/**
 * The artifact's two top-bar quick actions, as the prototype surfaces them: the card
 * download and the link copy are the most-used share paths, so they sit beside Share
 * rather than behind a tab inside its modal.
 *
 * A client leaf on purpose. Both buttons need local state for their in-flight and
 * copied feedback, but `RecView` itself must stay a Server Component — it calls
 * `getEnv()`, which validates the full server env (DATABASE_URL, the OAuth secrets)
 * and therefore throws anywhere `process.env` carries only the NEXT_PUBLIC_* keys.
 */
export function ListQuickActions({ url, card }: { url: string; card: SocialCardInput }) {
  return (
    <>
      <QuickExportCard card={card} />
      <QuickCopyLink url={url} />
    </>
  );
}

function QuickExportCard({ card }: { card: SocialCardInput }) {
  const [state, setState] = useState<"idle" | "working">("idle");

  async function handleExport() {
    setState("working");
    try {
      await downloadSocialCard(card, "tsugi-card.png");
    } finally {
      setState("idle");
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      // Hidden on the smallest screens: a 1200×630 PNG download is a desktop action,
      // and the same export stays reachable inside the Share modal everywhere.
      className="hidden rounded-full sm:inline-flex"
      disabled={state === "working"}
      onClick={handleExport}
      title="Download high-resolution 1200×630 social card PNG"
    >
      {state === "working" ? (
        <Loader2Icon className="animate-spin" aria-hidden />
      ) : (
        <DownloadIcon aria-hidden />
      )}
      Export card
    </Button>
  );
}

function QuickCopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard here (insecure context) — the Share modal still offers a
      // copyable input, so this is a convenience that can no-op.
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("rounded-full", copied && "text-success")}
      onClick={handleCopy}
      aria-label="Copy link to this list"
    >
      {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
