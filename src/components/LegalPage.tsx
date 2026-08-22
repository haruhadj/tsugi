import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared shell for static policy content (`/terms`, `/privacy`, D55). Plain prose in a
 * narrow column — these are read, not interacted with, so there is no card, no gradient,
 * nothing built out of `ui-tokens.md`'s brand system beyond the type stack and semantic
 * colour tokens. Server component; every value it renders is `children` from the caller.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl leading-tight font-extrabold tracking-[-0.02em] text-foreground">
        {title}
      </h1>
      <p className="mt-2 font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase">
        Last updated: {updated}
      </p>

      <div className="mt-8 flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground [&_strong]:text-foreground">
        {children}
      </div>

      <Link
        href="/"
        className="mt-10 inline-block font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Back
      </Link>
    </main>
  );
}
