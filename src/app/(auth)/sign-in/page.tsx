import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { EmailSignInToggle } from "@/components/EmailSignInToggle";
import { SignInButtons } from "@/components/SignInButtons";
import { Separator } from "@/components/ui/separator";
import { Wordmark } from "@/components/Wordmark";
import { getServerSession } from "@/lib/auth";

export default async function SignInPage() {
  // The mirror of /settings' guard. Without this, an already-signed-in visitor
  // who lands here — via the hero's "Make a list", a stale tab, or the browser
  // back button — sees the sign-in form again with nothing telling them
  // anything is different. That reads as a failed or forgotten login even
  // though the session is fine; it was the reported symptom, not a real auth
  // bug. There is nowhere better to send them yet — Phase 5 owns that — so `/`
  // is the honest destination, and it now shows its signed-in header.
  const session = await getServerSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6 sm:py-16">
      {/*
        Two off-centre glows in theme tokens, not artwork — the page is
        unauthenticated, so nothing licensed (cover art, character art) belongs
        here. Kept behind the card and never over the copy; `overflow-hidden`
        on `main` stops them from pushing the page wider on a narrow viewport.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-32 size-96 rounded-full bg-highlight/15 blur-3xl"
      />

      <div className="relative w-full max-w-sm animate-card-in">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden />
          Back
        </Link>

        {/* Same card as the hero's example, at the other end of the flow. */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          <div className="flex flex-col gap-8 p-8 sm:p-10">
            <div className="flex flex-col gap-5">
              <Wordmark size="lg" />
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-2xl leading-tight font-extrabold tracking-[-0.02em]">
                  Sign in
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You only need an account to make a list. Opening one never
                  asks for anything.
                </p>
              </div>
            </div>

            <SignInButtons />

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground uppercase">
                or
              </span>
              <Separator className="flex-1" />
            </div>

            <EmailSignInToggle />

            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link
                href="/sign-up"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Create one
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to the{" "}
              <Link
                href="/terms"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
