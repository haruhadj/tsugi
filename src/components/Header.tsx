"use client";

import {
  CompassIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/feed", label: "Rundown", icon: CompassIcon, needsSession: false },
  { href: "/", label: "Create", icon: PlusIcon, needsSession: true },
  { href: "/dashboard", label: "Your lists", icon: LayoutDashboardIcon, needsSession: true },
] as const;

/**
 * The app shell's top bar, on every screen. Sticky and blurred so the page scrolls
 * under it; a matching bottom tab bar takes over under `md`, where a horizontal nav
 * would crowd out the wordmark.
 *
 * `username` is null for signed-out visitors — the whole product is readable without
 * an account (invariant 9), so this renders a Sign in button rather than hiding.
 */
export function Header({ username }: { username: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  // Signed-out landing page already links to /feed itself (its hero card),
  // so the nav's own "Rundown" entry would just repeat it there.
  const isSignedOutLanding = pathname === "/" && username === null;
  const items = NAV.filter(
    (item) => (!item.needsSession || username !== null) && !(isSignedOutLanding && item.href === "/feed"),
  );

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" aria-label="Tsugi home" className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <Wordmark size="sm" />
            </Link>

            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActive(item.href)
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {/* The same glyphs the bottom bar uses, so a reader moving
                      between phone and desktop is looking at one nav. Tinted
                      when active, alongside the gradient underline rather than
                      instead of it — colour is never the only signal. */}
                  <item.icon
                    className={cn("size-3.5", isActive(item.href) && "text-primary")}
                    aria-hidden
                  />
                  {item.label}
                  {isActive(item.href) && (
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  /*
                    Hidden below `md`: the bottom tab bar's own "Settings" tab
                    reaches the same pages this dropdown does, and its Sign out
                    (the only one in the product — ProviderConnections) lives on
                    that Settings page, so this trigger is pure duplication on a
                    phone rather than a second way in.
                  */
                  className="hidden gap-2 rounded-full border-border pl-1.5 md:inline-flex"
                >
                  <span
                    aria-hidden
                    className="brand-gradient flex size-6 items-center justify-center rounded-full font-mono text-[11px] font-bold text-primary-foreground"
                  >
                    {username.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-32 truncate font-mono text-xs sm:inline">
                    {username}
                  </span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">
                  @{username}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboardIcon aria-hidden />
                    Your lists
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <SettingsIcon aria-hidden />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={signOut}>
                  <LogOutIcon aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/*
        The mobile counterpart. Rendered as its own <nav> rather than a reflow of the
        one above, because the two carry different items — the bottom bar has to reach
        settings and sign-in, which live in the dropdown on desktop.
      */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl md:hidden"
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
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium transition-colors",
                isActive(item.href) ? "text-primary" : "text-muted-foreground",
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
              isActive("/settings") ? "text-primary" : "text-muted-foreground",
            )}
          >
            <UserIcon className="size-5" aria-hidden />
            {username === null ? "Sign in" : "Settings"}
          </Link>
        </div>
      </nav>
    </>
  );
}
