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
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-20 lg:py-20">
      <section className="hidden max-w-xl lg:block">
        <Wordmark size="lg" />
        <p className="mt-10 font-display text-5xl leading-[1.08] font-extrabold tracking-[-0.03em] text-foreground">
          Your taste deserves a link of its own.
        </p>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
          Choose the titles you love, rate them, and share the list with anyone. You can also bring in titles from your tracker.
        </p>
        <div className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Signing in lets you create.</span> Anyone can open a list you share.
        </div>
      </section>

      <div className="w-full max-w-md animate-card-in justify-self-center lg:max-w-none">
        <Link
          href="/"
          className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Back to Tsugi
        </Link>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-8 p-8 sm:p-10">
            <div className="flex flex-col gap-5">
              <div className="lg:hidden"><Wordmark size="lg" /></div>
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
