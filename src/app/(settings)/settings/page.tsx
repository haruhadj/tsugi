import { Link2Icon, PaletteIcon, SlidersHorizontalIcon, UserIcon } from "lucide-react";
import { ColorSchemeField } from "@/components/ColorSchemeField";
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="animate-card-in grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)] leading-tight font-extrabold tracking-[-0.03em]">Settings</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Manage your identity, trackers, and reading preferences.</p>
          </div>

          {/*
            No brand-gradient rule on any card: settings is not an artifact, and
            spending the accent here would put it on the same screen as the header's
            active-nav underline for no reason.
          */}
          <div className="flex min-w-0 flex-col gap-4">
            <section className="overflow-hidden rounded-2xl border border-border bg-card/60">
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <UserIcon className="size-4 text-primary" aria-hidden />
                  Identity
                </h2>
                <UsernameField initialUsername={session.user.username ?? ""} />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card/60">
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <PaletteIcon className="size-4 text-primary" aria-hidden />
                  Colour scheme
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Choose the colours you read best. Some schemes also change the
                  background; score colours keep their meaning in every scheme.
                </p>
                <ColorSchemeField />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card/60">
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Link2Icon className="size-4 text-primary" aria-hidden />
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
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <SlidersHorizontalIcon className="size-4 text-primary" aria-hidden />
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
