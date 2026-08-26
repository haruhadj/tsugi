"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/header/AccountMenu";
import { MobileTabBar } from "@/components/header/MobileTabBar";
import { NAV, isActiveHref } from "@/components/header/nav";
import { useHideOnScroll } from "@/components/header/useHideOnScroll";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * The app shell's top bar, on every screen. Sticky and blurred so the page scrolls
 * under it; a matching bottom tab bar takes over under `md`, where a horizontal nav
 * would crowd out the wordmark.
 *
 * `username` is null for signed-out visitors — the whole product is readable without
 * an account (invariant 9), so this renders a Sign in button rather than hiding.
 *
 * `mobileMenu` is a page-specific slot (only `/feed` passes one, its browse
 * hamburger) — `Header` itself knows nothing about any page's own controls,
 * it just reserves the top-left corner on a phone for whichever page hands
 * it something. When present, it pushes the wordmark out of the flow it
 * normally shares with the nav and into the bar's dead centre instead, the
 * three-zone phone header shape (menu / mark / account) rather than the
 * left-anchored one desktop keeps.
 */
export function Header({
  username,
  mobileMenu,
}: {
  username: string | null;
  mobileMenu?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hidden = useHideOnScroll();

  // Signed-out landing page already links to /feed itself (its hero card),
  // so the nav's own "Rundown" entry would just repeat it there.
  const isSignedOutLanding = pathname === "/" && username === null;
  const items = NAV.filter(
    (item) => (!item.needsSession || username !== null) && !(isSignedOutLanding && item.href === "/feed"),
  );

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl transition-transform duration-300",
          // Desktop never hides — `hidden` only ever flips from a phone-sized
          // scroll delta, but the override keeps this true even if it did.
          hidden ? "-translate-y-full md:translate-y-0" : "translate-y-0",
        )}
      >
        <div className="relative flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-8">
            {mobileMenu}

            <Link
              href="/"
              aria-label="Tsugi home"
              className={cn(
                "rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                // Only pulled out of flow when there is a mobileMenu to make
                // room for — otherwise the wordmark stays exactly where it
                // always has, left-anchored, on every width.
                mobileMenu &&
                  "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:top-auto md:left-auto md:translate-x-0 md:translate-y-0",
              )}
            >
              <Wordmark size="sm" />
            </Link>

            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActiveHref(pathname, item.href) ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActiveHref(pathname, item.href)
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {/* The same glyphs the bottom bar uses, so a reader moving
                      between phone and desktop is looking at one nav. Tinted
                      when active, alongside the gradient underline rather than
                      instead of it — colour is never the only signal. */}
                  <item.icon
                    className={cn("size-3.5", isActiveHref(pathname, item.href) && "text-primary")}
                    aria-hidden
                  />
                  {item.label}
                  {isActiveHref(pathname, item.href) && (
                    <span
                      aria-hidden
                      className="brand-gradient absolute inset-x-3 -bottom-px h-0.5 rounded-full"
                    />
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {username === null ? (
            <Button asChild size="sm" className="rounded-full">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          ) : (
            <AccountMenu username={username} onSignOut={signOut} />
          )}
        </div>
      </header>

      <MobileTabBar username={username} pathname={pathname} hidden={hidden} />
    </>
  );
}
