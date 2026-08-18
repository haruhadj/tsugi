"use client";

import { Share2Icon } from "lucide-react";
import { useState } from "react";
import { ShareModal } from "@/components/ShareModal";
import { Button } from "@/components/ui/button";
import type { SocialCardInput } from "@/lib/canvasExport";

/**
 * The share entry point on /r/[slug]. The markdown block and the card's inputs are
 * both built on the server, where the list already is — this only opens the modal.
 */
export function ShareListButton({
  url,
  text,
  markdown,
  card,
}: {
  url: string;
  text: string;
  markdown: string;
  card: SocialCardInput;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        <Share2Icon aria-hidden />
        Share
      </Button>
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
