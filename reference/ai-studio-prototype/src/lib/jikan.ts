import { MediaItem, MediaType } from '../types';

/**
 * MyAnimeList API client using public Jikan v4 REST API
 */
const JIKAN_ENDPOINT = 'https://api.jikan.moe/v4';

export async function searchJikan(
  query: string,
  mediaType: MediaType | 'ALL' = 'ALL',
  limit: number = 8
): Promise<MediaItem[]> {
  if (!query.trim()) return [];

  const endpoint = mediaType === 'MANGA' ? 'manga' : 'anime';
  const url = `${JIKAN_ENDPOINT}/${endpoint}?q=${encodeURIComponent(
    query.trim()
  )}&limit=${limit}&sfw=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Jikan API returned ${response.status}`);
    }

    const json = await response.json();
    const data = json.data || [];

    return data.map((item: any) => {
      const type: MediaType = mediaType === 'MANGA' ? 'MANGA' : 'ANIME';
      const year =
        item.year ||
        (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined) ||
        (item.published?.from ? new Date(item.published.from).getFullYear() : undefined);

      return {
        provider: 'mal',
        mediaType: type,
        externalId: item.mal_id,
        title: {
          romaji: item.title || item.title_english || 'Untitled',
          english: item.title_english || item.title,
          native: item.title_japanese,
        },
        coverImage: {
          large:
            item.images?.webp?.large_image_url ||
            item.images?.jpg?.large_image_url ||
            item.images?.jpg?.image_url ||
            '',
          color: '#2e51a2', // MAL signature blue
        },
        bannerImage: undefined,
        format: item.type ? item.type.toUpperCase() : undefined,
        episodes: item.episodes || undefined,
        chapters: item.chapters || undefined,
        seasonYear: year,
        genres: (item.genres || []).map((g: any) => g.name),
        averageScore: item.score ? Math.round(item.score * 10) : undefined,
        description: item.synopsis || '',
        siteUrl: item.url || `https://myanimelist.net/${endpoint}/${item.mal_id}`,
      };
    });
  } catch (err) {
    console.error('Jikan search error:', err);
    return [];
  }
}
