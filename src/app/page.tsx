import type { CSSProperties } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ListBuilder } from "@/components/ListBuilder";
import { ArrowRightIcon, CompassIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { HANDLE_ROUTE } from "@/lib/require-handle";

// The hero says the product's name before it says anything else, and it says it the
// way the product is named: 次 — "next". Each letter is its own element so the run
// can be staggered, and the kanji lands last, on the end of it. Splitting the string
// here rather than at the call site keeps the markup one map and the name one word.
const NAME = "Tsugi".split("");

// Every entrance on this hero is one sequence, so the delays are written down once
// and read in order instead of being scattered across the JSX as arbitrary values.
// The wordmark is not in here: its timing is two animations deep and stays with the
// `.hero-glyph` / `.hero-kanji` rules in globals.css, driven by --glyph-i alone.
const ENTER = {
  eyebrow: "0ms",
  deck: "330ms",
  blurb: "410ms",
  action: "490ms",
  card: "570ms",
} as const;

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

        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
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

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="grid items-center gap-10 py-14 sm:gap-14 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p
              className="animate-card-in font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase"
              style={{ animationDelay: ENTER.eyebrow }}
            >
              For anime and manga
            </p>

            <h1 className="mt-6 font-display font-extrabold text-foreground">
              {/*
                The name is the headline. `aria-label` carries it as one word so a
                screen reader is not read five separate letters and a kanji.
              */}
              <span
                className="flex items-start text-[clamp(3.4rem,11vw,7rem)] leading-[0.86] tracking-[-0.045em]"
                aria-label="Tsugi"
              >
                {NAME.map((letter, i) => (
                  <span
                    key={`${letter}-${i}`}
                    className="hero-glyph"
                    style={{ "--glyph-i": i } as CSSProperties}
                    aria-hidden
                  >
                    {letter}
                  </span>
                ))}
                <span
                  className="hero-kanji ml-3 text-[0.28em] leading-none tracking-normal text-primary"
                  aria-hidden
                >
                  次
                </span>
              </span>

              <span
                className="animate-card-in mt-5 block text-[clamp(1.5rem,3.4vw,2.25rem)] leading-[1.05] tracking-[-0.03em] text-muted-foreground"
                style={{ animationDelay: ENTER.deck }}
              >
                One link. Your whole taste.
              </span>
            </h1>

            <p
              className="animate-card-in mt-7 max-w-md text-base leading-relaxed text-muted-foreground"
              style={{ animationDelay: ENTER.blurb }}
            >
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
            <div
              className="animate-card-in mt-9 flex flex-wrap items-center gap-x-6 gap-y-4"
              style={{ animationDelay: ENTER.action }}
            >
              <Button asChild size="lg">
                <Link href="/sign-in">Make a list</Link>
              </Button>
              <p className="font-mono text-xs text-muted-foreground">
                Sign in with AniList or MyAnimeList
              </p>
            </div>
          </div>

          {/*
            Descriptive rather than a filled-in example: a version of this
            block once invented a title, a 92/100, and a quote nobody wrote,
            which is dummy data on the product's own front door. This just
            points at the real thing, one click away.
          */}
          <div className="animate-card-in" style={{ animationDelay: ENTER.card }}>
            <Link
              href="/feed"
              className="group block rounded-2xl border border-border bg-card p-8 shadow-xl transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-10"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                <CompassIcon className="size-6 text-primary" aria-hidden />
              </div>
              <h2 className="mt-6 font-display text-xl font-bold tracking-[-0.01em] text-foreground">
                Browse the rundown
              </h2>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Every list people have published, ranked by what the room thinks of them.
                See what a shared link actually looks like before you make your own.
              </p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                See the feed
                <ArrowRightIcon
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          </div>
        </section>

        {/*
          The three steps are divided from each other in both directions. Above `sm`
          that is the vertical rule between columns; below it, where they stack, it
          has to be a horizontal one — without `divide-y` the section was a single
          run of text with three orphaned eyebrows in it, and the sequence the
          numbering encodes stopped being legible as a sequence.
        */}
        <section className="grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STEPS.map((step) => (
            <div key={step.marker} className="py-8 sm:px-8 sm:py-10 sm:first:pl-0 sm:last:pr-0">
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
