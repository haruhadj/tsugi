import { Code2Icon } from "lucide-react";
import Link from "next/link";

/**
 * Quiet bottom bar carrying the two policy routes (D55) and the source link. Lives in
 * `layout.tsx` rather than per-page like `Header` — it needs no session, so there is no
 * per-page prop to thread. `pb-14 md:pb-0` on `<body>` already clears Header's fixed
 * mobile tab bar, so this renders above that bar in flow rather than needing its own
 * fixed positioning.
 */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
        <nav aria-label="Legal" className="flex items-center gap-4">
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
        </nav>

        <a
          href="https://github.com/haruhadj/tsugi"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <Code2Icon className="size-3.5" aria-hidden />
          Source
        </a>
      </div>
    </footer>
  );
}
