import type { Metadata, Viewport } from "next";
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

/*
  Next ships `width=device-width, initial-scale=1` by default; this adds the one
  thing it does not.

  `viewportFit: "cover"` lets the page paint into the display cutout and home-
  indicator areas, and — the actual reason it is here — it is what makes
  `env(safe-area-inset-bottom)` report a real number. Without it the inset is
  always 0px and `--rail` (globals.css) silently under-measures on exactly the
  phones that need it, putting the bottom row of tab labels under the gesture bar.

  `themeColor` paints the browser chrome the ground colour, so the address bar
  does not sit as a white band above a navy page. Hardcoded because this is a meta
  tag, not CSS — it cannot read a token, and it tracks --background's D57 value
  (#101434). It is the same class of exception as the OG card (ui-tokens.md).
*/
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#101434",
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
        `pb-rail` keeps the end of every page clear of Header's fixed mobile tab bar
        and of the home indicator below it. It lives here rather than in Header
        because a fixed element is out of flow — a spacer inside Header would sit at
        the top of the document, where it clears nothing.

        This was `pb-14 md:pb-0`, which was right about the bar's height and wrong
        about the hardware: on a phone with a gesture bar the last 34px of every page
        sat under it. `--rail` carries both, and collapses to 0 at `md` on its own,
        so the breakpoint no longer needs restating here.
      */}
      <body className="pb-rail">
        {/*
          Colour scheme (D56/D57): a `data-palette` attribute read from a plain
          cookie, set before hydration so switching schemes in Settings never
          flashes the default on the next load. Render-blocking and inline on
          purpose — anything deferred runs after first paint. "raiden" needs no
          attribute; it's what globals.css's unscoped block already renders
          (src/lib/palette.ts's DEFAULT_PALETTE — kept literal here since inline
          script content can't import a module).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var m=document.cookie.match(/(?:^|; )tsugi-palette=([^;]+)/);' +
              'var p=m&&decodeURIComponent(m[1]);' +
              'if(p&&p!=="raiden")document.documentElement.setAttribute("data-palette",p);' +
              "}catch(e){}})();",
          }}
        />
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
