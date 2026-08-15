"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ItemTray, canAddItem, type TrayItem } from "@/components/ItemTray";
import { MediaSearchInput } from "@/components/MediaSearchInput";
import { MyListPicker } from "@/components/MyListPicker";
import { ProviderToggle } from "@/components/ProviderToggle";
import { ShareModal } from "@/components/ShareModal";
import { authClient } from "@/lib/auth-client";
import type { ScoreFormat } from "@/lib/score";
import type { CreateRecItem } from "@/lib/validators/rec";
import type { ListEntry, MediaType, Provider, UnifiedMediaResult } from "@/lib/types/media";

const MEDIA_TYPE: MediaType = "anime";
const TRACKER_PROVIDER_IDS: Provider[] = ["anilist", "mal"];
type Mode = "search" | "mylist";

function toWireItem(item: TrayItem, scoreFormat: ScoreFormat): CreateRecItem {
  return {
    provider: item.provider,
    externalId: item.externalId,
    mediaType: item.mediaType,
    ...(item.scoreRaw != null ? { scoreRaw: item.scoreRaw, scoreFormat } : {}),
    ...(item.comment ? { comment: item.comment } : {}),
  } as CreateRecItem;
}

export function RecBuilder({ scoreFormat }: { scoreFormat: ScoreFormat }) {
  const [provider, setProvider] = useState<Provider>("anilist");
  const [mode, setMode] = useState<Mode>("search");
  const [items, setItems] = useState<TrayItem[]>([]);
  const [caption, setCaption] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [linkedProviderIds, setLinkedProviderIds] = useState<string[] | null>(null);

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      setLinkedProviderIds(data?.map((account) => account.providerId) ?? []);
    });
  }, []);

  const hasTrackerLinked = linkedProviderIds?.some((id) => TRACKER_PROVIDER_IDS.includes(id as Provider)) ?? false;

  const handleSelect = (result: UnifiedMediaResult) => {
    if (!canAddItem(items)) return;
    if (items.some((item) => item.provider === result.provider && item.externalId === result.externalId)) {
      return;
    }
    setItems([...items, { ...result, scoreRaw: null, comment: "" }]);
  };

  const handleImport = (entry: ListEntry) => {
    if (!canAddItem(items)) return;
    if (items.some((item) => item.provider === entry.provider && item.externalId === entry.externalId)) {
      return;
    }
    setItems([
      ...items,
      {
        provider: entry.provider,
        externalId: entry.externalId,
        mediaType: entry.mediaType,
        title: entry.title,
        titleNative: entry.titleNative,
        coverImage: entry.coverImage,
        year: null,
        averageScore: null,
        scoreRaw: entry.scoreFormat === scoreFormat ? entry.scoreRaw : null,
        comment: "",
      },
    ]);
  };

  const handleSubmit = async () => {
    setError(null);

    if (items.length === 0) {
      setError("Add at least one title.");
      return;
    }
    const hasSignal = Boolean(comment) || items.some((item) => item.scoreRaw !== null || item.comment);
    if (!hasSignal) {
      setError("Add a score or a comment somewhere before sharing.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption || undefined,
          comment: comment || undefined,
          items: items.map((item) => toWireItem(item, scoreFormat)),
        }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { slug: string };
        setShareUrl(`${window.location.origin}/r/${data.slug}`);
        return;
      }
      if (res.status === 429) {
        setError("Too many recommendations created recently. Try again shortly.");
      } else if (res.status === 401) {
        setError("Sign in to create a recommendation.");
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not save this recommendation.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {hasTrackerLinked && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Add from</legend>
          <RadioGroup
            value={mode}
            onValueChange={(next) => setMode(next as Mode)}
            className="flex flex-row gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="search" id="mode-search" className="size-[18px]" />
              <Label htmlFor="mode-search" className="min-h-11 flex items-center">
                Search
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="mylist" id="mode-mylist" className="size-[18px]" />
              <Label htmlFor="mode-mylist" className="min-h-11 flex items-center">
                My list
              </Label>
            </div>
          </RadioGroup>
        </fieldset>
      )}
      <ProviderToggle value={provider} onChange={setProvider} />
      {mode === "search" ? (
        <MediaSearchInput
          provider={provider}
          mediaType={MEDIA_TYPE}
          onSelect={handleSelect}
          onSwitchProvider={setProvider}
          atCapacity={!canAddItem(items)}
        />
      ) : (
        <MyListPicker
          provider={provider}
          mediaType={MEDIA_TYPE}
          onImport={handleImport}
          atCapacity={!canAddItem(items)}
          isSelected={(entry) =>
            items.some((item) => item.provider === entry.provider && item.externalId === entry.externalId)
          }
        />
      )}
      <ItemTray items={items} onChange={setItems} scoreFormat={scoreFormat} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="rec-caption">Caption (optional)</Label>
        <Input
          id="rec-caption"
          value={caption}
          maxLength={120}
          placeholder="A short line about this list"
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rec-comment">Comment (optional)</Label>
        <Input
          id="rec-comment"
          value={comment}
          maxLength={280}
          placeholder="Why you're sharing this"
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="button" className="min-h-11" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Sharing…" : "Share"}
      </Button>
      <ShareModal
        open={shareUrl !== null}
        onOpenChange={(open) => {
          if (!open) setShareUrl(null);
        }}
        url={shareUrl ?? ""}
        text={caption || undefined}
      />
    </div>
  );
}
