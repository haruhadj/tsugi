import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ListView } from "@/server/services/lists";

export const FILTERS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "drafts", label: "Drafts" },
] as const;

export type Filter = (typeof FILTERS)[number]["id"];

export function useDashboardRecs(initialRecs: ListView[]) {
  const router = useRouter();
  const [recs, setRecs] = useState(initialRecs);
  const [filter, setFilter] = useState<Filter>("all");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  // Deleting is immediate and total, so the button asks once before it fires.
  const [confirmingSlug, setConfirmingSlug] = useState<string | null>(null);
  const [error, setError] = useState<{ slug: string; message: string } | null>(null);

  const counts = {
    all: recs.length,
    published: recs.filter((rec) => rec.published).length,
    drafts: recs.filter((rec) => !rec.published).length,
  };

  const visible = recs.filter((rec) =>
    filter === "all" ? true : filter === "published" ? rec.published : !rec.published,
  );

  async function deleteRec(slug: string) {
    setBusySlug(slug);
    setError(null);
    const res = await fetch(`/api/lists/${slug}`, { method: "DELETE" });
    if (res.ok) {
      // Deleted slugs are never reissued (criterion 7) — dropping it from
      // local state without a refetch is safe.
      setRecs((current) => current.filter((rec) => rec.slug !== slug));
    } else {
      setError({ slug, message: "Could not delete this list. Try again." });
    }
    setBusySlug(null);
    setConfirmingSlug(null);
  }

  async function togglePublish(rec: ListView) {
    setBusySlug(rec.slug);
    setError(null);
    const action = rec.published ? "unpublish" : "publish";
    const res = await fetch(`/api/lists/${rec.slug}/${action}`, { method: "POST" });
    if (res.ok) {
      setRecs((current) =>
        current.map((item) =>
          item.slug === rec.slug ? { ...item, published: !item.published } : item,
        ),
      );
    } else {
      setError({
        slug: rec.slug,
        message: rec.published
          ? "Could not unpublish this list. Try again."
          : "Could not publish this list. Try again.",
      });
    }
    setBusySlug(null);
  }

  async function duplicate(rec: ListView) {
    setBusySlug(rec.slug);
    setError(null);
    const res = await fetch(`/api/lists/${rec.slug}/duplicate`, { method: "POST" });
    if (res.ok) {
      // The copy is a whole new row with a server-assigned slug, so this refetches
      // rather than guessing what the server wrote.
      router.refresh();
    } else if (res.status === 429) {
      const { retryAfter } = await res.json();
      setError({ slug: rec.slug, message: `Too many lists. Wait ${retryAfter}s.` });
    } else {
      setError({ slug: rec.slug, message: "Could not duplicate this list. Try again." });
    }
    setBusySlug(null);
  }

  return {
    isEmpty: recs.length === 0,
    filter,
    setFilter,
    counts,
    visible,
    busySlug,
    confirmingSlug,
    setConfirmingSlug,
    error,
    deleteRec,
    togglePublish,
    duplicate,
  };
}
