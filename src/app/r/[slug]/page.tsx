import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { RecView } from "@/components/RecView";
import { getEnv } from "@/lib/env";
import {
  getRecommendationBySlug,
  incrementViewCount,
} from "@/server/services/recommendations";

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
  const rec = await getRecommendationBySlug(slug);
  if (!rec) return {};

  const appUrl = getEnv().NEXT_PUBLIC_APP_URL;
  const pageUrl = `${appUrl}/r/${slug}`;
  const imageUrl = `${appUrl}/r/${slug}/opengraph-image`;
  const title = rec.caption ?? rec.items.map((item) => item.title).join(", ");
  const description = rec.comment ?? "A recommendation shared on Tsugi.";

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
  const rec = await getRecommendationBySlug(slug);
  if (!rec) notFound();

  // Deferred via after() (invariant: page-only view counting, PHASE-6.md) —
  // runs after the response is flushed so it never delays the render, but
  // unlike a bare `void` call it survives past response-send on Vercel's
  // serverless runtime, which can freeze the function before an unawaited
  // promise resolves (confirmed via concurrent-load testing: bare `void`
  // dropped most writes under 20 concurrent requests).
  after(() => incrementViewCount(slug));

  return <RecView rec={rec} />;
}
