import Link from "next/link";
import { Header } from "@/components/Header";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import { ListBuilder } from "@/components/ListBuilder";
import { getServerSession } from "@/lib/auth";
import type { ScoreFormat } from "@/lib/score";

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
              <ListBuilder scoreFormat={session.user.scoreFormat as ScoreFormat} />
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
            Typographic on purpose — an eyecatch is type and light, and Tsugi cannot
            hotlink a cover it has not fetched yet.
          */}
          <div className="animate-card-in [animation-delay:140ms]">
            <figure className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <div className="brand-gradient h-1 w-full" />
                <div className="p-8 sm:p-10">
                  <p className="font-mono text-[0.65rem] tracking-[0.3em] text-muted-foreground uppercase">
                    via AniList
                  </p>
                  <p className="mt-5 font-display text-3xl leading-tight font-extrabold tracking-[-0.02em] text-foreground sm:text-4xl">
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
                    <ScoreBadge scoreRaw={92} scoreFormat="POINT_100" size="lg" />
                  </div>
                </div>
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
