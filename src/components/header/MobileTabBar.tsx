import { UserIcon } from "lucide-react";
import Link from "next/link";
import { NAV, isActiveHref } from "@/components/header/nav";
import { cn } from "@/lib/utils";

/**
 * The mobile counterpart to the desktop top bar. Rendered as its own <nav> rather
 * than a reflow of the one above, because the two carry different items — the
 * bottom bar has to reach settings and sign-in, which live in the dropdown on
 * desktop.
 */
export function MobileTabBar({
  username,
  pathname,
  hidden,
}: {
  username: string | null;
  pathname: string;
  hidden: boolean;
}) {
  const items = NAV.filter((item) => !item.needsSession || username !== null);

  return (
    <nav
      aria-label="Main"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl transition-transform duration-300 md:hidden",
        hidden && "translate-y-full",
      )}
    >
      {/*
        The bar's own padding, not the page's: the row of targets stops above the
        home indicator, and the blurred ground keeps painting behind it so the bar
        still reaches the physical bottom edge instead of leaving a navy gap. The
        `min-h-14` on each link is the 3.5rem half of --rail; this inset is the
        other half, which is why the two are read together there.
      */}
      <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom,0px)]">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActiveHref(pathname, item.href) ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium transition-colors",
              isActiveHref(pathname, item.href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        ))}
        <Link
          href={username === null ? "/sign-in" : "/settings"}
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium transition-colors",
            isActiveHref(pathname, "/settings") ? "text-primary" : "text-muted-foreground",
          )}
        >
          <UserIcon className="size-5" aria-hidden />
          {username === null ? "Sign in" : "You"}
        </Link>
      </div>
    </nav>
  );
}
