"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardTab } from "@/components/share-modal/CardTab";
import { LinkTab } from "@/components/share-modal/LinkTab";
import { MarkdownTab } from "@/components/share-modal/MarkdownTab";
import { useShareModalState } from "@/components/share-modal/useShareModalState";
import type { SocialCardInput } from "@/lib/canvasExport";

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
  const {
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
  } = useShareModalState({ open, url, card });

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

          <LinkTab
            url={url}
            text={text}
            copyState={copyState}
            setCopyState={setCopyState}
            discordCopyState={discordCopyState}
            setDiscordCopyState={setDiscordCopyState}
            copyText={copyText}
          />

          {markdown && (
            <MarkdownTab
              markdown={markdown}
              markdownCopyState={markdownCopyState}
              setMarkdownCopyState={setMarkdownCopyState}
              copyText={copyText}
            />
          )}

          {card && <CardTab cardState={cardState} onCopy={copyCard} onSave={saveCard} />}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
