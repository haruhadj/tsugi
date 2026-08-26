import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ListCategory } from "@/lib/categories";
import type { CreateListItem } from "@/lib/validators/list";
import type { BuilderList } from "@/components/ListBuilder";

type Body = {
  name: string;
  category: ListCategory;
  caption?: string;
  comment?: string;
  items: CreateListItem[];
};

export type PendingAction = "draft" | "publish" | "save" | null;

/**
 * The create/save network calls and the pending/notice/share-url state they
 * drive. Split out of `ListBuilder` so the request handling doesn't sit next
 * to the step-rail JSX.
 */
export function useListBuilderSubmit({
  existing,
  body,
  validate,
  setError,
}: {
  existing: BuilderList | undefined;
  body: () => Body;
  validate: () => boolean;
  setError: (error: string | null) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  /**
   * Saving an edit (D59). A whole-list replacement, so this sends the same body a
   * create does — see `editListSchema`. On success it navigates to the artifact
   * rather than staying put: the point of editing a published list is to see the
   * thing readers now see.
   */
  const saveEdit = async () => {
    if (!existing) return;
    setError(null);
    setSavedNotice(null);
    if (!validate()) return;

    setPending("save");
    try {
      const res = await fetch(`/api/lists/${existing.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body()),
      });

      if (res.status === 204) {
        // refresh() first so the artifact page re-reads rather than serving the
        // router cache's copy of the list as it was before this save.
        router.refresh();
        router.push(`/r/${existing.slug}`);
        return;
      }
      if (res.status === 429) {
        const { retryAfter } = (await res.json()) as { retryAfter: number };
        setError(`Saving too fast. Try again in ${retryAfter}s.`);
      } else if (res.status === 401) {
        setError("Sign in to edit this list.");
      } else if (res.status === 404) {
        setError("This list no longer exists, or is not yours to edit.");
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not save these changes.");
      }
    } finally {
      setPending(null);
    }
  };

  const submit = async (publish: boolean) => {
    setError(null);
    setSavedNotice(null);
    if (!validate()) return;

    setPending(publish ? "publish" : "draft");
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body(), publish }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { slug: string };
        if (publish) {
          setShareUrl(`${window.location.origin}/r/${data.slug}`);
        } else {
          setSavedNotice("Draft saved. You can publish it from your lists.");
        }
        return;
      }
      if (res.status === 429) {
        setError("Too many lists created recently. Try again shortly.");
      } else if (res.status === 401) {
        setError("Sign in to create a list.");
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not save this list.");
      }
    } finally {
      setPending(null);
    }
  };

  return { pending, savedNotice, shareUrl, setShareUrl, submit, saveEdit, router };
}
