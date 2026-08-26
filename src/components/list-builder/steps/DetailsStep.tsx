import { LayersIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LIST_CATEGORIES, type ListCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

const CAPTION_LIMIT = 120;
const COMMENT_LIMIT = 280;

export function DetailsStep({
  name,
  onNameChange,
  category,
  onCategoryChange,
  caption,
  onCaptionChange,
  comment,
  onCommentChange,
}: {
  name: string;
  onNameChange: (value: string) => void;
  category: ListCategory;
  onCategoryChange: (value: ListCategory) => void;
  caption: string;
  onCaptionChange: (value: string) => void;
  comment: string;
  onCommentChange: (value: string) => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-5">
      <h2 className="flex items-center gap-1.5 font-mono text-[0.65rem] font-semibold tracking-[0.24em] text-muted-foreground uppercase">
        <LayersIcon className="size-3.5 text-primary" aria-hidden="true" />
        List details
      </h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="list-name">Title</Label>
        <Input
          id="list-name"
          value={name}
          maxLength={80}
          placeholder="Ten romances that actually end"
          onChange={(event) => onNameChange(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="list-category">Category</Label>
        <Select value={category} onValueChange={(next) => onCategoryChange(next as ListCategory)}>
          <SelectTrigger id="list-category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIST_CATEGORIES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs leading-relaxed text-muted-foreground">
          This is how the list is filed on the rundown. The title above is free text.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="list-caption">Caption (optional)</Label>
          <span className="font-mono text-[10px] text-muted-foreground">
            {caption.length}/{CAPTION_LIMIT}
          </span>
        </div>
        <Textarea
          id="list-caption"
          rows={2}
          maxLength={CAPTION_LIMIT}
          value={caption}
          placeholder="A short line about this list"
          className="resize-none text-sm"
          onChange={(event) => onCaptionChange(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="list-comment">Note (optional)</Label>
          <span
            className={cn(
              "font-mono text-[10px]",
              comment.length >= COMMENT_LIMIT
                ? "font-bold text-destructive"
                : "text-muted-foreground",
            )}
          >
            {comment.length}/{COMMENT_LIMIT}
          </span>
        </div>
        <Textarea
          id="list-comment"
          rows={3}
          maxLength={COMMENT_LIMIT}
          value={comment}
          placeholder="Why you're sharing this"
          className="resize-none text-sm"
          onChange={(event) => onCommentChange(event.target.value)}
        />
      </div>
    </section>
  );
}
