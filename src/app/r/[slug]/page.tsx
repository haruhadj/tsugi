import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

  // Fire-and-forget (invariant: page-only view counting, PHASE-6.md) — never
  // awaited, so a slow or failed increment cannot delay or break the render.
  void incrementViewCount(slug);

  return <RecView rec={rec} />;
}
