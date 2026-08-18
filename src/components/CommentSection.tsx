"use client";

import {
  AwardIcon,
  CheckIcon,
  CopyIcon,
  Loader2Icon,
  MessageSquareIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { VotePill, type VoteDirection } from "@/components/VotePill";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { WireComment } from "@/lib/types/comment";
import { COMMENT_SORTS, type CommentSort } from "@/lib/validators/comment";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 280;

const SORT_LABELS: Record<CommentSort, string> = {
  top: "Top",
  new: "Newest",
  old: "Oldest",
};

const QUICK_EMOJI = ["🔥", "💯", "😭", "🎌", "👏", "🤯", "✨", "☕"];

function relativeTime(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * The discussion on a list.
 *
 * `initialComments` is rendered on the server, so the thread is in the HTML on first
 * paint — no spinner, and no fetch-on-mount effect. Every later refresh is driven by
 * something the reader did (sorting, posting, deleting), which is what keeps this a
 * plain event handler rather than an effect synchronising against the server.
 */
export function CommentSection({
  slug,
  items,
  isSignedIn,
  initialComments,
}: {
  slug: string;
  /** The list's titles, so a commenter can tag one as their pick. */
  items: { position: number; title: string }[];
  isSignedIn: boolean;
  initialComments: WireComment[];
}) {
  const [comments, setComments] = useState<WireComment[]>(initialComments);
  const [sort, setSort] = useState<CommentSort>("top");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextSort: CommentSort) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/lists/${slug}/comments?sort=${nextSort}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { comments: WireComment[] };
        setComments(data.comments);
        setError(null);
      } catch {
        setError("Couldn't load the discussion.");
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );

  const refresh = useCallback(() => load(sort), [load, sort]);

  function changeSort(next: CommentSort) {
    setSort(next);
    void load(next);
  }

  const total = comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0);

  return (
    <section id="discussion" className="mt-10 scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <MessageSquareIcon className="size-4 text-muted-foreground" aria-hidden />
          Discussion
          <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
            {total}
          </span>
        </h2>

        <div
          role="group"
          aria-label="Sort comments"
          className="inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary/40 p-0.5"
        >
          {COMMENT_SORTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeSort(option)}
              aria-pressed={sort === option}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                sort === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {SORT_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {isSignedIn ? (
          <Composer slug={slug} items={items} onPosted={refresh} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 p-4">
            <p className="text-sm text-muted-foreground">
              Sign in to join the discussion.
            </p>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
            Loading discussion
          </div>
        ) : error ? (
          <p className="py-6 text-sm text-destructive">{error}</p>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <MessageSquareIcon className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <h3 className="mt-3 font-display font-bold">No comments yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to say something about this list.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((comment) => (
              <li key={comment.id}>
                <CommentCard
                  comment={comment}
                  slug={slug}
                  items={items}
                  isSignedIn={isSignedIn}
                  onChanged={refresh}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Composer({
  slug,
  items,
  parentId,
  onPosted,
  onCancel,
  autoFocus = false,
}: {
  slug: string;
  items: { position: number; title: string }[];
  parentId?: string;
  onPosted: () => void | Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [content, setContent] = useState("");
  const [favorite, setFavorite] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_LENGTH - content.length;
  const canSubmit = content.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/lists/${slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.trim(),
        ...(parentId ? { parentId } : {}),
        ...(favorite !== "" ? { favoritePosition: Number(favorite) } : {}),
      }),
    });

    if (res.status === 429) {
      const { retryAfter } = await res.json();
      setError(`Too many comments. Wait ${retryAfter}s.`);
    } else if (res.status === 401) {
      setError("Sign in to comment.");
    } else if (!res.ok) {
      setError("Couldn't post that. Try again.");
    } else {
      // Only clear on success — an error must never destroy what was typed.
      setContent("");
      setFavorite("");
      await onPosted();
      onCancel?.();
    }

    setSubmitting(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      {parentId && onCancel && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] text-muted-foreground">Writing a reply</p>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel reply"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-3.5" aria-hidden />
          </button>
        </div>
      )}

      <Textarea
        value={content}
        autoFocus={autoFocus}
        maxLength={MAX_LENGTH}
        rows={3}
        placeholder={parentId ? "Write a reply…" : "What did you think of this list?"}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          // Enter submits, Shift+Enter breaks the line — the comment cap is short
          // enough that multi-line is the rarer intent.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        className="resize-none border-input bg-background"
      />

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {QUICK_EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`Add ${emoji}`}
            disabled={content.length + emoji.length > MAX_LENGTH}
            onClick={() => setContent((current) => current + emoji)}
            className="rounded-full px-1.5 py-1 text-sm transition-colors hover:bg-accent disabled:opacity-40"
          >
            {emoji}
          </button>
        ))}
      </div>

      {!parentId && items.length > 0 && (
        <label className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <SparklesIcon className="size-3.5" aria-hidden />
          Your pick
          <select
            value={favorite}
            onChange={(event) => setFavorite(event.target.value)}
            className="min-h-9 max-w-56 flex-1 rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <option value="">None</option>
            {items.map((item) => (
              <option key={item.position} value={item.position}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            remaining <= 20 ? "text-highlight" : "text-muted-foreground",
          )}
        >
          {remaining}
        </span>
        <Button size="sm" className="rounded-full" disabled={!canSubmit} onClick={submit}>
          {submitting ? (
            <Loader2Icon className="animate-spin" aria-hidden />
          ) : (
            <SendIcon aria-hidden />
          )}
          {parentId ? "Reply" : "Post"}
        </Button>
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  slug,
  items,
  isSignedIn,
  onChanged,
  isReply = false,
}: {
  comment: WireComment;
  slug: string;
  items: { position: number; title: string }[];
  isSignedIn: boolean;
  onChanged: () => void | Promise<void>;
  isReply?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [score, setScore] = useState(comment.score);
  const [direction, setDirection] = useState<VoteDirection>(comment.viewerVote);
  const [busy, setBusy] = useState(false);

  async function vote(next: 1 | -1) {
    if (busy || !isSignedIn) return;
    setBusy(true);
    const res = await fetch(`/api/comments/${comment.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction: next }),
    });
    if (res.ok) {
      const { direction: applied } = (await res.json()) as { direction: VoteDirection };
      setScore((current) => current - direction + applied);
      setDirection(applied);
    }
    setBusy(false);
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
    if (res.ok) await onChanged();
    setBusy(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(comment.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Denied clipboard access needs no recovery — the text is on screen.
    }
  }

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card/40 p-4",
        isReply && "border-l-2 border-l-primary/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden
          className="brand-gradient flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-primary-foreground"
        >
          {comment.authorUsername.charAt(0).toUpperCase()}
        </span>
        <span className="font-mono text-xs font-semibold text-foreground">
          {comment.authorUsername}
        </span>

        {comment.isCurator && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
            <AwardIcon className="size-3" aria-hidden />
            Curator
          </span>
        )}

        <time
          dateTime={comment.createdAt}
          className="font-mono text-[11px] text-muted-foreground"
        >
          {relativeTime(comment.createdAt)}
        </time>

        {comment.favoriteTitle && (
          <span className="inline-flex max-w-52 items-center gap-1 truncate rounded-full border border-highlight/30 bg-highlight/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-highlight">
            <SparklesIcon className="size-3 shrink-0" aria-hidden />
            {comment.favoriteTitle}
          </span>
        )}
      </div>

      <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
        {comment.content}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <VotePill
          score={score}
          direction={direction}
          onVote={vote}
          disabled={busy || !isSignedIn}
          size="sm"
        />

        {/* Replies are one level deep, so a reply carries no reply button. */}
        {!isReply && isSignedIn && (
          <button
            type="button"
            onClick={() => setReplying((open) => !open)}
            className="rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Reply
          </button>
        )}

        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? (
            <CheckIcon className="size-3 text-success" aria-hidden />
          ) : (
            <CopyIcon className="size-3" aria-hidden />
          )}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>

        {comment.viewerIsAuthor && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
          >
            <Trash2Icon className="size-3" aria-hidden />
            Delete
          </button>
        )}
      </div>

      {replying && (
        <div className="mt-3">
          <Composer
            slug={slug}
            items={items}
            parentId={comment.id}
            autoFocus
            onPosted={onChanged}
            onCancel={() => setReplying(false)}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 pl-3 sm:pl-6">
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentCard
                comment={reply}
                slug={slug}
                items={items}
                isSignedIn={isSignedIn}
                onChanged={onChanged}
                isReply
              />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
