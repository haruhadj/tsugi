import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Header } from "@/components/Header";
import { RecView } from "@/components/RecView";
import { getEnv } from "@/lib/env";
import { getServerSession } from "@/lib/auth";
import { getListBySlug, incrementViewCount } from "@/server/services/lists";

type Params = Promise<{ slug: string }>;

// D-per-PHASE-6: absolute URLs for og:image are built from NEXT_PUBLIC_APP_URL
// only, never from request headers() — the OG route is fetched by crawlers
// whose Host header this app does not control.
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const session = await getServerSession();
  const rec = await getListBySlug(slug, session?.user.id ?? null);
  if (!rec) return {};

  const appUrl = getEnv().NEXT_PUBLIC_APP_URL;
  const pageUrl = `${appUrl}/r/${slug}`;
  const imageUrl = `${appUrl}/r/${slug}/opengraph-image`;
  // The list has a name of its own now (Phase C), so the shared title is that
  // name rather than a joined run of item titles.
  const title = rec.name;
  const description =
    rec.comment ?? rec.caption ?? `${rec.items.length} titles, scored and shared on Tsugi.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function RecommendationPage({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await getServerSession();
  const rec = await getListBySlug(slug, session?.user.id ?? null);
  if (!rec) notFound();

  // Deferred via after() (invariant: page-only view counting, PHASE-6.md) —
  // runs after the response is flushed so it never delays the render, but
  // unlike a bare `void` call it survives past response-send on Vercel's
  // serverless runtime, which can freeze the function before an unawaited
  // promise resolves (confirmed via concurrent-load testing: bare `void`
  // dropped most writes under 20 concurrent requests).
  //
  // Only logged-in views count, deduped against the durable `listView` table
  // (persists across devices and sessions) so a view only lands once per user.
  const userId = session?.user.id ?? null;
  if (userId) after(() => incrementViewCount(slug, userId));

  // A visitor can land here from anywhere with no account, so the page carries the
  // full header — it is the only route back into the product.
  return (
    <div className="min-h-screen">
      <Header username={session ? (session.user.username ?? session.user.name) : null} />
      <RecView rec={rec} />
    </div>
  );
}
