import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInButtons } from "@/components/SignInButtons";
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
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md animate-card-in">
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
                  You only need an account to make a list. Opening one never asks for
                  anything.
                </p>
              </div>
            </div>

            <SignInButtons />

            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to the{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 inline-block font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Back
        </Link>
      </div>
    </main>
  );
}
