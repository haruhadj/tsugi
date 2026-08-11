import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth";

// The create flow really is ordered — you cannot score a title you have not picked,
// and the link does not exist until both are done. That is why these carry step
// markers; nothing else on the page does.
const STEPS = [
  {
    marker: "01",
    title: "Pick",
    body: "Search AniList or MyAnimeList. Add one title, or up to ten.",
  },
  {
    marker: "02",
    title: "Score",
    body: "Rate on the scale you already use. A 5 out of 5 never turns into a 5 out of 100.",
  },
  {
    marker: "03",
    title: "Share",
    body: "Get a link that unfurls into a preview card. Anyone can open it, account or not.",
  },
] as const;

export default async function Home() {
  // The only session-aware element on this page. Everything past the header still
  // assumes a signed-out visitor, because the create flow this page becomes in
  // Phase 5 hasn't been built yet (PHASE-2.md: "sign-in works; nothing else is
  // reachable yet") — this exists only so a completed sign-in has a visible
  // effect anywhere, rather than requiring a database query to confirm.
  const session = await getServerSession();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
        <Wordmark />
        <Button asChild variant="ghost" size="sm">
          <Link href={session ? "/settings" : "/sign-in"}>
            {session ? "Settings" : "Sign in"}
          </Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="animate-card-in">
            <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
              For anime and manga
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.6rem,7vw,4.75rem)] leading-[0.92] font-extrabold tracking-[-0.035em] text-foreground uppercase">
              One link.
              <br />
              Your whole
              <br />
              <span className="text-primary">taste.</span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground">
              Score the titles you would hand to someone, and Tsugi turns them into a link
              worth sending. Making one takes about ten seconds. Opening one takes no
              account at all.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link href="/sign-in">Start a rec</Link>
              </Button>
              <p className="font-mono text-xs text-muted-foreground">
                Sign in with AniList or MyAnimeList
              </p>
            </div>
          </div>

          {/*
            The thesis, shown rather than described: this is the artifact you send.
            Typographic on purpose — an eyecatch is type and light, and Tsugi cannot
            hotlink a cover it has not fetched yet.
          */}
          <div className="animate-card-in [animation-delay:140ms]">
            <figure className="relative">
              <div className="relative overflow-hidden rounded-md border border-border bg-card">
                <div className="eyecatch-edge absolute inset-y-0 left-0 w-1" />
                <div className="p-8 pl-10 sm:p-10 sm:pl-12">
                  <p className="font-mono text-[0.65rem] tracking-[0.3em] text-muted-foreground uppercase">
                    via AniList
                  </p>
                  <p className="mt-5 font-display text-3xl leading-tight font-extrabold tracking-[-0.02em] text-foreground uppercase sm:text-4xl">
                    Frieren
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Beyond Journey&rsquo;s End
                  </p>

                  <div className="mt-8 flex items-end justify-between gap-6">
                    <p className="max-w-[18rem] text-sm leading-relaxed text-foreground/85">
                      &ldquo;Watch it slowly. It is about the parts of a journey you only
                      notice afterwards.&rdquo;
                    </p>
                    <p className="font-mono text-4xl leading-none font-medium text-bloom">
                      92
                      <span className="text-base text-muted-foreground">/100</span>
                    </p>
                  </div>
                </div>
                <div className="eyecatch-bar h-0.5 w-full" />
              </div>
              <figcaption className="mt-3 font-mono text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
                Example preview card
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="grid border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
          {STEPS.map((step) => (
            <div key={step.marker} className="py-10 sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <p className="font-mono text-xs tracking-[0.3em] text-primary">{step.marker}</p>
              <h2 className="mt-4 font-display text-lg font-semibold tracking-[-0.01em] text-foreground uppercase">
                {step.title}
              </h2>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 py-12">
          <p className="font-mono text-xs text-muted-foreground">
            次 — the next thing you should read or watch
          </p>
          <Link
            href={session ? "/settings" : "/sign-in"}
            className="font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {session ? "Settings" : "Sign in"}
          </Link>
        </footer>
      </main>
    </div>
  );
}
