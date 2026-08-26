import { useEffect, useState } from "react";
import { copySocialCard, downloadSocialCard, type SocialCardInput } from "@/lib/canvasExport";

export type CopyState = "pending" | "copied" | "failed";
export type CardState = "idle" | "working" | "copied" | "failed";

/**
 * `card` and `markdown` are optional: the builder opens this modal the moment a list
 * is created, when it has the URL but not yet the resolved titles the card and the
 * markdown block need. Those tabs only appear once there is something to put in them.
 */
export function useShareModalState({
  open,
  url,
  card,
}: {
  open: boolean;
  url: string;
  card?: SocialCardInput;
}) {
  const [copyState, setCopyState] = useState<CopyState>("pending");
  const [discordCopyState, setDiscordCopyState] = useState<CopyState>("pending");
  const [markdownCopyState, setMarkdownCopyState] = useState<CopyState>("pending");
  const [cardState, setCardState] = useState<CardState>("idle");
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

  return {
    copyState,
    setCopyState,
    discordCopyState,
    setDiscordCopyState,
    markdownCopyState,
    setMarkdownCopyState,
    cardState,
    copyText,
    copyCard,
    saveCard,
  };
}
