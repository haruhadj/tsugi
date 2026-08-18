import { Link2Icon, SlidersHorizontalIcon, UserIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { ProviderConnections } from "@/components/ProviderConnections";
import { UsernameField } from "@/components/UsernameField";
import { requireHandledSession } from "@/lib/require-handle";

export default async function SettingsPage() {
  // Redirects to /sign-in without a session, or to /handle without a username (D49).
  const session = await requireHandledSession();

  return (
    <div className="min-h-screen">
      <Header username={session.user.username ?? session.user.name} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="animate-card-in">
          <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
            Settings
          </p>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
            Connected accounts
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Link a tracker to pull in titles you have already scored. Linking a second one
            never replaces the first.
          </p>

          {/*
            No brand-gradient rule on any card: settings is not an artifact, and
            spending the accent here would put it on the same screen as the header's
            active-nav underline for no reason.
          */}
          <div className="mt-8 flex flex-col gap-4">
            <section className="overflow-hidden rounded-2xl border border-border bg-card/60">
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <h2 className="flex items-center gap-1.5 font-mono text-[0.65rem] font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                  <UserIcon className="size-3.5 text-primary" aria-hidden />
                  Identity
                </h2>
                <UsernameField initialUsername={session.user.username ?? ""} />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card/60">
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <h2 className="flex items-center gap-1.5 font-mono text-[0.65rem] font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                  <Link2Icon className="size-3.5 text-primary" aria-hidden />
                  Connected trackers
                </h2>
                <ProviderConnections />
              </div>
            </section>

            {/*
              Read-only on purpose. The prototype offers a rating-scale picker,
              but since D47 everything typed in Tsugi is out of ten — this value
              only decides how a score *imported* from a tracker is interpreted,
              and it is captured from that tracker at sign-in. A picker here
              would imply it changes what you rate in, which it does not.
            */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card/40">
              <div className="flex flex-col gap-3 p-6 sm:p-8">
                <h2 className="flex items-center gap-1.5 font-mono text-[0.65rem] font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                  <SlidersHorizontalIcon className="size-3.5 text-primary" aria-hidden />
                  Rating scale
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You rate out of ten here. Scores pulled in from a tracker keep the scale
                  you gave them there — currently{" "}
                  <span className="font-mono text-foreground">{session.user.scoreFormat}</span>,
                  read from your account when you signed in.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
