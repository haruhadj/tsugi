import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { HrefFor } from "@/lib/feed-params";

/**
 * Handed to `FeedList` rather than rendered after it: once infinite scroll has
 * appended a page, these links would navigate away from rows already on
 * screen, so `FeedList` drops them at that point. They stay for anyone whose
 * JS never ran, and for anyone who wants a page in their history.
 */
export function FeedPagination({
  page,
  pageSize,
  entriesLength,
  firstSlot,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  entriesLength: number;
  firstSlot: number;
  hrefFor: HrefFor;
}) {
  // Every child here carries its own `key`, same as the root element does at
  // the call site: this whole tree crosses into `FeedList` (a Client
  // Component) as a prop, and serialization drops the marker JSX puts on
  // statically written children — so React re-checks it as if it were an
  // entry in a dynamic list.
  return (
    <div className="mt-8 flex items-center justify-between">
      {page > 1 ? (
        <Button key="back" asChild variant="ghost" size="sm" className="rounded-full">
          <Link href={hrefFor({ page: page - 1 })}>Back</Link>
        </Button>
      ) : (
        <span key="back" />
      )}
      {entriesLength === pageSize ? (
        <Button key="next" asChild variant="ghost" size="sm" className="rounded-full">
          <Link href={hrefFor({ page: page + 1 })}>
            Slot {firstSlot + pageSize} onward
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
