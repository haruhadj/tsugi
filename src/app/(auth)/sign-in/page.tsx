import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInButtons } from "@/components/SignInButtons";
import { Wordmark } from "@/components/Wordmark";
import { getServerSession } from "@/lib/auth";

export default async function SignInPage() {
  // The mirror of /settings' guard. Without this, an already-signed-in visitor
  // who lands here — via the hero's "Start a rec", a stale tab, or the browser
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
        <div className="relative overflow-hidden rounded-md border border-border bg-card">
          <div className="eyecatch-edge absolute inset-y-0 left-0 w-1" />
          <div className="flex flex-col gap-8 p-8 pl-10 sm:p-10 sm:pl-12">
            <div className="flex flex-col gap-5">
              <Wordmark />
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-2xl leading-tight font-extrabold tracking-[-0.02em] uppercase">
                  Sign in
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You only need an account to make a recommendation. Opening one never
                  asks for anything.
                </p>
              </div>
            </div>

            <SignInButtons />
          </div>
          <div className="eyecatch-bar h-0.5 w-full" />
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
