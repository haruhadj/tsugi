import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { ListBuilder, toTrayItems } from "@/components/ListBuilder";
import { Button } from "@/components/ui/button";
import type { ListCategory } from "@/lib/categories";
import { requireHandledSession } from "@/lib/require-handle";
import { getOwnedListBySlug } from "@/server/services/lists";

type Params = Promise<{ slug: string }>;

// Nothing here is for a crawler: the route redirects anyone without a session,
// and its content is a copy of /r/[slug] that only one person can open.
export const metadata: Metadata = {
  title: "Edit list",
  robots: { index: false, follow: false },
};

/**
 * The edit surface (**D59**, which reversed the "editing is out of scope" line in
 * `functionality.md`). The same builder that creates a list, handed the list it is
 * editing — one component, so a field added to the create flow cannot go missing
 * from the edit flow.
 *
 * `getOwnedListBySlug` answers null for a list that is not the caller's, including
 * a *published* one, so someone else's live list 404s here rather than rendering a
 * form whose save would be refused. Draft or published makes no difference: both
 * are editable, and a published list changes in place at the link it already has.
 */
export default async function EditListPage({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await requireHandledSession();
  const rec = await getOwnedListBySlug(slug, session.user.id);
  if (!rec) notFound();

  return (
    <div className="min-h-screen">
      <Header username={session.user.username ?? session.user.name} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="animate-card-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
                {rec.published ? "Editing a live list" : "Editing a draft"}
              </p>
              <h1 className="mt-3 font-display text-[clamp(1.6rem,4.5vw,2.25rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
                Edit
              </h1>
            </div>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link href={`/r/${slug}`}>
                <ArrowLeftIcon aria-hidden="true" />
                Back to the list
              </Link>
            </Button>
          </div>

          {/*
            An honest warning rather than a blocked action. The reason editing was
            out of scope has not stopped being true — a link someone already posted
            now shows something else — so the person changing it is told, once,
            where they can see it.
          */}
          {rec.published && (
            <p className="mt-5 rounded-2xl border border-highlight/30 bg-highlight/10 px-4 py-3 text-xs leading-relaxed text-foreground/85">
              This list is live. Saving changes what anyone who already has the link
              sees — including its social preview card.
            </p>
          )}

          <div className="mt-8">
            <ListBuilder
              existing={{
                slug: rec.slug,
                name: rec.name,
                category: rec.category as ListCategory,
                caption: rec.caption,
                comment: rec.comment,
                items: toTrayItems(rec.items),
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
