import Link from "next/link";
import { redirect } from "next/navigation";
import { EmailPasswordForm } from "@/components/EmailPasswordForm";
import { Wordmark } from "@/components/Wordmark";
import { getServerSession } from "@/lib/auth";

export default async function SignUpPage() {
  // Mirrors sign-in's guard (src/app/(auth)/sign-in/page.tsx) — same reasoning.
  const session = await getServerSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-md animate-card-in">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          <div className="flex flex-col gap-8 p-8 sm:p-10">
            <div className="flex flex-col gap-5">
              <Wordmark size="lg" />
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-2xl leading-tight font-extrabold tracking-[-0.02em]">
                  Create an account
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Prefer AniList or MyAnimeList?{" "}
                  <Link
                    href="/sign-in"
                    className="text-foreground underline underline-offset-2 hover:no-underline"
                  >
                    Sign in with a tracker
                  </Link>{" "}
                  instead.
                </p>
              </div>
            </div>

            <EmailPasswordForm mode="sign-up" />

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Sign in
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              By creating an account, you agree to the{" "}
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
