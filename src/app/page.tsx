import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ListBuilder } from "@/components/ListBuilder";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { HANDLE_ROUTE } from "@/lib/require-handle";

// The create flow really is ordered — you cannot score a title you have not picked,
// and the link does not exist until both are done. That is why these carry step
// markers; nothing else on the page does.
const STEPS = [
  {
    marker: "01",
    title: "Pick",
    body: "Search AniList or MyAnimeList. Add one title, or a few hundred.",
  },
  {
    marker: "02",
    title: "Score",
    body: "Rate on the scale you already use. A 5 out of 5 never turns into a 5 out of 100.",
  },
  {
    marker: "03",
    title: "Share",
    body:
      "Get a link that unfurls into a preview card. Publish it and it joins the rundown.",
  },
] as const;

export default async function Home() {
  const session = await getServerSession();

  // Not `requireHandledSession()`: signed out, this page is the product's
  // marketing front rather than a redirect to sign-in, so only the signed-in
  // branch is gated (D49).
  if (session && !session.user.username) {
    redirect(HANDLE_ROUTE);
  }

  if (session) {
    return (
      <div className="min-h-screen">
        <Header username={session.user.username ?? session.user.name} />

        <main className="mx-auto max-w-6xl px-6 py-16">
          <div className="animate-card-in">
            <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
              New list
            </p>
            <h1 className="mt-4 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[0.95] font-extrabold tracking-[-0.03em]">
              Pick, score,
              <br />
              share.
            </h1>

            <div className="mt-10">
              <ListBuilder />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header username={null} />

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="animate-card-in">
            <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
              For anime and manga
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.6rem,7vw,4.75rem)] leading-[0.92] font-extrabold tracking-[-0.035em] text-foreground">
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
            {/*
              One primary action per screen (ui-tokens.md), so "Browse the
              rundown" is a quiet text link rather than a second button. The
              action is named "Make a list" here and stays that name through
              sign-in and the builder.
            */}
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button asChild size="lg">
                <Link href="/sign-in">Make a list</Link>
              </Button>
              <Link
                href="/feed"
                className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Browse the rundown
              </Link>
              <p className="font-mono text-xs text-muted-foreground">
                Sign in with AniList or MyAnimeList
              </p>
            </div>
          </div>

          {/*
            The thesis, shown rather than described: this is the artifact you send.
            Deliberately the card's *anatomy* and not a filled-in example — the
            version before this one invented a title, a 92/100, and a quote nobody
            wrote, which is dummy data on the product's own front door. The slots
            are labelled and empty instead, so the shape of the artifact is the
            claim and nothing here asserts that a particular rec exists.

            Dashed outlines rather than solid filled bars, and no `animate-pulse`:
            this must read as a blueprint, not as a loading skeleton (ui-rules.md
            reserves skeletons for a known-size block actually being filled).
          */}
          <div className="animate-card-in [animation-delay:140ms]">
            <figure className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <div className="p-8 sm:p-10">
                  {/* True of every card: both trackers are real sources. */}
                  <p className="font-mono text-[0.65rem] tracking-[0.3em] text-muted-foreground uppercase">
                    Via AniList or MyAnimeList
                  </p>

                  <div className="mt-6">
                    <p className="font-mono text-[0.6rem] tracking-[0.22em] text-muted-foreground/70 uppercase">
                      Title
                    </p>
                    <div className="mt-2.5 h-7 w-3/4 rounded-md border border-dashed border-border bg-secondary/30" />
                    <div className="mt-2 h-3.5 w-2/5 rounded border border-dashed border-border bg-secondary/20" />
                  </div>

                  <div className="mt-8 flex items-end justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[0.6rem] tracking-[0.22em] text-muted-foreground/70 uppercase">
                        Your note
                      </p>
                      <div className="mt-2.5 flex flex-col gap-1.5">
                        <div className="h-3 w-full rounded border border-dashed border-border bg-secondary/20" />
                        <div className="h-3 w-4/5 rounded border border-dashed border-border bg-secondary/20" />
                      </div>
                    </div>
                    <div className="shrink-0 text-center">
                      <p className="font-mono text-[0.6rem] tracking-[0.22em] text-muted-foreground/70 uppercase">
                        Score
                      </p>
                      {/* An em dash, not a number: a score is a (raw, format) pair
                          and there is no pair to render here. */}
                      <div className="mt-2.5 flex size-14 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30">
                        <span
                          aria-hidden
                          className="font-display text-xl font-bold text-muted-foreground/50"
                        >
                          &mdash;
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <figcaption className="mt-3 font-mono text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
                What your link unfurls into
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="grid border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
          {STEPS.map((step) => (
            <div key={step.marker} className="py-10 sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <p className="font-mono text-xs tracking-[0.3em] text-primary">{step.marker}</p>
              <h2 className="mt-4 font-display text-lg font-semibold tracking-[-0.01em] text-foreground">
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
            href="/sign-in"
            className="font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Sign in
          </Link>
        </footer>
      </main>
    </div>
  );
}
