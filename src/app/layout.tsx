import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono, Unbounded } from "next/font/google";
import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { TopLoader } from "@/components/TopLoader";
import "./globals.css";

// Three roles, three faces (context/ui-tokens.md § Type):
// Unbounded carries the broadcast-title voice, Inter Tight reads as body, and
// JetBrains Mono holds anything numeric — scores are the product's only real data.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["600", "800"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

// 600/700 are loaded because the redesign sets scores, tier letters, and vote counts
// in bold mono; without them the browser synthesises a faux-bold that reads muddy at
// the small sizes those appear in.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Tsugi",
  description: "Score the anime and manga you would hand to someone, and share the list.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Tsugi ships one theme. `dark` is here so shadcn's own `dark:` variants
    // resolve against the palette in globals.css rather than a light one that
    // does not exist.
    //
    // suppressHydrationWarning: browser extensions write to <html> before React
    // hydrates — a screen-dimming extension injecting `--oip-dim-overlay-bg` was
    // the observed case — and React reports the resulting attribute mismatch as a
    // hydration error on every page load. It applies to this element's own
    // attributes only, not to its children, and everything we set here is static,
    // so it hides nobody's real bug. Do not spread it further down the tree.
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${unbounded.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      {/*
        pb-14 under `md` keeps the end of every page clear of Header's fixed mobile
        tab bar. It lives here rather than in Header because a fixed element is out
        of flow — a spacer inside Header would sit at the top of the document, where
        it clears nothing.
      */}
      <body className="pb-14 md:pb-0">
        {/* useSearchParams needs a Suspense boundary to stay statically
            renderable — see TopLoader for why it depends on that hook. */}
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        {children}
        {/* Global, session-less — unlike Header this needs no per-page prop, so it
            lives once here rather than being threaded through every page.tsx. */}
        <Footer />
      </body>
    </html>
  );
}
