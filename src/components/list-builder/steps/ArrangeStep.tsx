import { EyeIcon, InfoIcon, TagIcon } from "lucide-react";
import { ItemTray, type TrayItem } from "@/components/ItemTray";
import { SocialCardPreview } from "@/components/SocialCardPreview";
import { Button } from "@/components/ui/button";
import type { ListCategory } from "@/lib/categories";

export function ArrangeStep({
  items,
  onItemsChange,
  showCard,
  onShowCardChange,
  caption,
  name,
  comment,
  category,
  genres,
}: {
  items: TrayItem[];
  onItemsChange: (items: TrayItem[]) => void;
  showCard: boolean;
  onShowCardChange: (show: boolean) => void;
  caption: string;
  name: string;
  comment: string;
  category: ListCategory;
  genres: { name: string; count: number }[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          Titles
          <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
            {items.length}
          </span>
        </h2>
        <Button
          type="button"
          variant={showCard ? "secondary" : "outline"}
          size="sm"
          aria-pressed={showCard}
          onClick={() => onShowCardChange(!showCard)}
        >
          <EyeIcon aria-hidden="true" />
          Social card
        </Button>
      </div>

      {showCard && (
        <SocialCardPreview
          title={caption || name || "Untitled list"}
          subtitle={caption ? name : null}
          comment={comment || null}
          category={category}
          items={items}
        />
      )}

      {/* The auto-aggregated genre cloud */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-3">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.18em] text-foreground uppercase">
          <TagIcon className="size-3 text-primary" aria-hidden="true" />
          Genres ({genres.length})
        </span>
        {genres.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {genres.map((genre) => (
              <span
                key={genre.name}
                className="rounded-md border border-primary/30 bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                {genre.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">
            Add titles and their genres collect here automatically.
          </p>
        )}
        <p className="flex items-start gap-1.5 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
          <InfoIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>
            Titles bring their own genres, and readers can filter the rundown by any of
            them. Imported titles fill theirs in once the list is saved.
          </span>
        </p>
      </div>

      <ItemTray items={items} onChange={onItemsChange} />
    </div>
  );
}
