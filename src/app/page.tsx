import type { CSSProperties } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ListBuilder } from "@/components/ListBuilder";
import { ArrowRightIcon } from "lucide-react";
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
  { marker: "01", title: "Pick" },
  { marker: "02", title: "Score" },
  { marker: "03", title: "Share" },
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
      {/*
        The signed-out landing page carries no header, so the hero owns the whole
        viewport and centres in it. `svh` rather than `vh` so a phone's collapsing
        address bar does not push the block off-centre mid-scroll.
      */}
      <main className="mx-auto flex min-h-svh max-w-6xl items-center px-4 sm:px-6">
        <section className="flex w-full flex-col items-center gap-10 py-14 text-center sm:gap-14 sm:py-28">
          <div className="flex flex-col items-center">
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
                className="flex items-start justify-center text-[clamp(3.4rem,11vw,7rem)] leading-[0.86] tracking-[-0.045em]"
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
              className="animate-card-in mt-7 max-w-md text-balance text-base leading-relaxed text-muted-foreground"
              style={{ animationDelay: ENTER.blurb }}
            >
              Score the titles you would hand to someone, and Tsugi turns them into a link
              worth sending. Making one takes about ten seconds. Opening one takes no
              account at all.
            </p>
            {/*
              "Make a list" stays the one primary action — "See the feed" is an
              outline button beside it so the pair reads as one row, without
              competing for the filled treatment. The primary action keeps that
              name through sign-in and the builder.
            */}
            <div
              className="animate-card-in mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-4"
              style={{ animationDelay: ENTER.action }}
            >
              <Button asChild size="lg">
                <Link href="/sign-in">Make a list</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/feed" className="group">
                  See the feed
                  <ArrowRightIcon
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </Button>
            </div>

            {/*
              The create flow is ordered — you cannot score a title you have not
              picked — so the steps stay numbered, but as one quiet line under the
              actions rather than a section of their own.
            */}
            <ol
              className="animate-card-in mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase"
              style={{ animationDelay: ENTER.action }}
            >
              {STEPS.map((step) => (
                <li key={step.marker} className="flex items-center gap-2">
                  <span className="text-primary">{step.marker}</span>
                  {step.title}
                </li>
              ))}
            </ol>
          </div>
        </section>

      </main>
    </div>
  );
}
