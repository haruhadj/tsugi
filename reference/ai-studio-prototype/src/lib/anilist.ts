import { MediaItem, MediaType } from '../types';

const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

export const CURATED_POPULAR_TITLES: MediaItem[] = [
  {
    provider: 'anilist',
    mediaType: 'ANIME',
    externalId: 154587,
    title: {
      romaji: 'Sousou no Frieren',
      english: "Frieren: Beyond Journey's End",
      native: '葬送のフリーレン',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
      color: '#5b8e9b',
    },
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    format: 'TV',
    episodes: 28,
    seasonYear: 2023,
    genres: ['Adventure', 'Drama', 'Fantasy'],
    averageScore: 94,
    description: 'The story follows elven mage Frieren, a former member of the party of adventurers who defeated the Demon King and restored harmony to the world.',
    siteUrl: 'https://anilist.co/anime/154587',
  },
  {
    provider: 'anilist',
    mediaType: 'ANIME',
    externalId: 9253,
    title: {
      romaji: 'Steins;Gate',
      english: 'Steins;Gate',
      native: 'STEINS;GATE',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80',
      color: '#d48834',
    },
    format: 'TV',
    episodes: 24,
    seasonYear: 2011,
    genres: ['Drama', 'Psychological', 'Sci-Fi', 'Thriller'],
    averageScore: 90,
    description: 'Self-proclaimed mad scientist Rintarou Okabe accidentally invents a microwave phone that can send messages back into the past.',
    siteUrl: 'https://anilist.co/anime/9253',
  },
  {
    provider: 'anilist',
    mediaType: 'MANGA',
    externalId: 30002,
    title: {
      romaji: 'Berserk',
      english: 'Berserk',
      native: 'ベルセルク',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      color: '#b3261e',
    },
    format: 'MANGA',
    chapters: 380,
    volumes: 42,
    seasonYear: 1989,
    genres: ['Action', 'Adventure', 'Drama', 'Fantasy', 'Horror'],
    averageScore: 93,
    description: 'Guts, a former mercenary known as the Black Swordsman, is out for vengeance against his former comrade Griffith.',
    siteUrl: 'https://anilist.co/manga/30002',
  },
  {
    provider: 'anilist',
    mediaType: 'ANIME',
    externalId: 140960,
    title: {
      romaji: 'Spy x Family',
      english: 'SPY x FAMILY',
      native: 'SPY×FAMILY',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
      color: '#4db588',
    },
    format: 'TV',
    episodes: 12,
    seasonYear: 2022,
    genres: ['Action', 'Comedy', 'Supernatural'],
    averageScore: 84,
    description: 'Master spy Twilight is tasked with building a mock family to infiltrate an elite private academy, unaware his wife is an assassin and his daughter is a telepath.',
    siteUrl: 'https://anilist.co/anime/140960',
  },
  {
    provider: 'anilist',
    mediaType: 'ANIME',
    externalId: 130003,
    title: {
      romaji: 'Bocchi the Rock!',
      english: 'BOCCHI THE ROCK!',
      native: 'ぼっち・ざ・ろっく！',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      color: '#e75480',
    },
    format: 'TV',
    episodes: 12,
    seasonYear: 2022,
    genres: ['Comedy', 'Music', 'Slice of Life'],
    averageScore: 88,
    description: 'Hitori Gotoh is an extremely anxious high school girl who dreams of playing in a rock band to make friends.',
    siteUrl: 'https://anilist.co/anime/130003',
  },
  {
    provider: 'anilist',
    mediaType: 'ANIME',
    externalId: 16498,
    title: {
      romaji: 'Shingeki no Kyojin',
      english: 'Attack on Titan',
      native: '進撃の巨人',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?auto=format&fit=crop&w=600&q=80',
      color: '#8b4513',
    },
    format: 'TV',
    episodes: 25,
    seasonYear: 2013,
    genres: ['Action', 'Drama', 'Fantasy', 'Mystery'],
    averageScore: 86,
    description: 'Centuries ago, mankind was slaughtered by monstrous humanoid titans. Eren Yeager vows to cleanse the earth of every titan.',
    siteUrl: 'https://anilist.co/anime/16498',
  },
  {
    provider: 'anilist',
    mediaType: 'MANGA',
    externalId: 105398,
    title: {
      romaji: 'Chainsaw Man',
      english: 'Chainsaw Man',
      native: 'チェンソーマン',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      color: '#f97316',
    },
    format: 'MANGA',
    chapters: 175,
    seasonYear: 2018,
    genres: ['Action', 'Comedy', 'Drama', 'Horror', 'Supernatural'],
    averageScore: 86,
    description: 'Denji is a teenage boy living with a Chainsaw Devil named Pochita, hunting devils to pay off his deceased father\'s massive debts.',
    siteUrl: 'https://anilist.co/manga/105398',
  },
  {
    provider: 'anilist',
    mediaType: 'ANIME',
    externalId: 145064,
    title: {
      romaji: 'Jujutsu Kaisen Season 2',
      english: 'JUJUTSU KAISEN Season 2',
      native: '呪術廻戦 懐玉・玉折 / 渋谷事変',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
      color: '#4338ca',
    },
    format: 'TV',
    episodes: 23,
    seasonYear: 2023,
    genres: ['Action', 'Fantasy', 'Supernatural'],
    averageScore: 88,
    description: 'Past and present collide as Gojo Satoru and Suguru Geto confront their fateful past during their Jujutsu High days before the catastrophic Shibuya Incident.',
    siteUrl: 'https://anilist.co/anime/145064',
  },
  {
    provider: 'anilist',
    mediaType: 'ANIME',
    externalId: 21519,
    title: {
      romaji: 'Kimi no Na wa.',
      english: 'Your Name.',
      native: '君の名は。',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      color: '#38bdf8',
    },
    format: 'MOVIE',
    episodes: 1,
    seasonYear: 2016,
    genres: ['Drama', 'Romance', 'Supernatural'],
    averageScore: 88,
    description: 'Two teenagers share a profound, magical connection upon discovering they are swapping bodies across space and time.',
    siteUrl: 'https://anilist.co/anime/21519',
  },
  {
    provider: 'anilist',
    mediaType: 'MANGA',
    externalId: 30013,
    title: {
      romaji: 'One Piece',
      english: 'One Piece',
      native: 'ONE PIECE',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
      color: '#eab308',
    },
    format: 'MANGA',
    chapters: 1120,
    seasonYear: 1997,
    genres: ['Action', 'Adventure', 'Comedy', 'Fantasy'],
    averageScore: 92,
    description: 'Monkey D. Luffy refuses to let anyone or anything stand in the way of his quest to become the King of All Pirates.',
    siteUrl: 'https://anilist.co/manga/30013',
  },
  {
    provider: 'anilist',
    mediaType: 'ANIME',
    externalId: 19,
    title: {
      romaji: 'Monster',
      english: 'Monster',
      native: 'モンスター',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      color: '#64748b',
    },
    format: 'TV',
    episodes: 74,
    seasonYear: 2004,
    genres: ['Drama', 'Mystery', 'Psychological', 'Thriller'],
    averageScore: 89,
    description: 'Dr. Kenzo Tenma, an elite neurosurgeon in Germany, saves a young boy\'s life, unaware that he will grow into a terrifying, charismatic psychopath.',
    siteUrl: 'https://anilist.co/anime/19',
  },
  {
    provider: 'anilist',
    mediaType: 'ANIME',
    externalId: 153518,
    title: {
      romaji: 'Dungeon Meshi',
      english: 'Delicious in Dungeon',
      native: 'ダンジョン飯',
    },
    coverImage: {
      large: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      color: '#10b981',
    },
    format: 'TV',
    episodes: 24,
    seasonYear: 2024,
    genres: ['Adventure', 'Comedy', 'Fantasy'],
    averageScore: 86,
    description: 'After having their supplies eaten by a red dragon, a party of adventurers decides to sustain themselves by cooking monsters in the dungeon.',
    siteUrl: 'https://anilist.co/anime/153518',
  }
];

const SEARCH_QUERY = `
query ($search: String, $type: MediaType, $perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(search: $search, type: $type, sort: [POPULARITY_DESC, SCORE_DESC], isAdult: false) {
      id
      type
      format
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
        color
      }
      bannerImage
      episodes
      chapters
      volumes
      seasonYear
      genres
      averageScore
      description(asHtml: false)
      siteUrl
    }
  }
}
`;

export async function searchAniList(
  query: string,
  mediaType: MediaType | 'ALL' = 'ALL',
  limit: number = 10
): Promise<MediaItem[]> {
  const trimmed = query.trim().toLowerCase();

  // If query is short or empty, return curated list filtered
  if (!trimmed) {
    return CURATED_POPULAR_TITLES.filter(item => {
      if (mediaType !== 'ALL' && item.mediaType !== mediaType) return false;
      return true;
    }).slice(0, limit);
  }

  try {
    const variables: Record<string, any> = {
      search: query,
      perPage: limit,
    };
    if (mediaType !== 'ALL') {
      variables.type = mediaType;
    }

    const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`AniList returned status ${response.status}`);
    }

    const json = await response.json();
    const mediaList = json.data?.Page?.media;

    if (!mediaList || !Array.isArray(mediaList) || mediaList.length === 0) {
      // Fallback to client-side filter of curated list
      return CURATED_POPULAR_TITLES.filter(item => {
        const matchesType = mediaType === 'ALL' || item.mediaType === mediaType;
        const matchesTitle =
          item.title.romaji.toLowerCase().includes(trimmed) ||
          (item.title.english && item.title.english.toLowerCase().includes(trimmed)) ||
          item.genres.some(g => g.toLowerCase().includes(trimmed));
        return matchesType && matchesTitle;
      });
    }

    return mediaList.map((m: any) => ({
      provider: 'anilist',
      mediaType: m.type as MediaType,
      externalId: m.id,
      title: {
        romaji: m.title.romaji || m.title.english || 'Untitled',
        english: m.title.english,
        native: m.title.native,
      },
      coverImage: {
        large: m.coverImage?.large || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
        medium: m.coverImage?.medium,
        color: m.coverImage?.color || '#3b82f6',
      },
      bannerImage: m.bannerImage,
      format: m.format,
      episodes: m.episodes,
      chapters: m.chapters,
      volumes: m.volumes,
      seasonYear: m.seasonYear,
      genres: m.genres || [],
      averageScore: m.averageScore,
      description: m.description ? m.description.replace(/<[^>]*>?/gm, '').slice(0, 300) : '',
      siteUrl: m.siteUrl || `https://anilist.co/${m.type.toLowerCase()}/${m.id}`,
    }));
  } catch (error) {
    console.warn('AniList live search fallback to curated offline data:', error);
    return CURATED_POPULAR_TITLES.filter(item => {
      const matchesType = mediaType === 'ALL' || item.mediaType === mediaType;
      const matchesTitle =
        item.title.romaji.toLowerCase().includes(trimmed) ||
        (item.title.english && item.title.english.toLowerCase().includes(trimmed)) ||
        item.genres.some(g => g.toLowerCase().includes(trimmed));
      return matchesType && matchesTitle;
    });
  }
}

const USER_ANILIST_QUERY = `
query ($username: String, $type: MediaType) {
  MediaListCollection(userName: $username, type: $type, status_in: [CURRENT, COMPLETED, PLANNING]) {
    lists {
      name
      status
      entries {
        score(format: POINT_100)
        notes
        media {
          id
          type
          format
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            color
          }
          episodes
          chapters
          seasonYear
          genres
          averageScore
          siteUrl
        }
      }
    }
  }
}
`;

export async function fetchAniListUserCollection(
  username: string,
  mediaType: MediaType = 'ANIME'
): Promise<Array<{ score?: number; comment?: string; media: MediaItem }>> {
  try {
    const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: USER_ANILIST_QUERY,
        variables: { username, type: mediaType },
      }),
    });

    if (!response.ok) {
      throw new Error(`AniList returned status ${response.status}`);
    }

    const data = await response.json();
    const lists = data.data?.MediaListCollection?.lists || [];
    const results: Array<{ score?: number; comment?: string; media: MediaItem }> = [];

    for (const list of lists) {
      for (const entry of list.entries || []) {
        if (!entry.media) continue;
        results.push({
          score: entry.score || 0,
          comment: entry.notes || '',
          media: {
            provider: 'anilist',
            mediaType: entry.media.type,
            externalId: entry.media.id,
            title: {
              romaji: entry.media.title.romaji || entry.media.title.english || 'Untitled',
              english: entry.media.title.english,
              native: entry.media.title.native,
            },
            coverImage: {
              large: entry.media.coverImage?.large || '',
              color: entry.media.coverImage?.color || '#3b82f6',
            },
            format: entry.media.format,
            episodes: entry.media.episodes,
            chapters: entry.media.chapters,
            seasonYear: entry.media.seasonYear,
            genres: entry.media.genres || [],
            averageScore: entry.media.averageScore,
            siteUrl: entry.media.siteUrl,
          },
        });
      }
    }

    return results;
  } catch (err) {
    console.error('Failed to fetch AniList user library:', err);
    throw err;
  }
}

/**
 * Fetch MyAnimeList user collection using Jikan v4 public endpoint with robust parsing
 */
export async function fetchMALUserCollection(
  username: string,
  mediaType: MediaType = 'ANIME'
): Promise<Array<{ score?: number; comment?: string; media: MediaItem }>> {
  const typeEndpoint = mediaType === 'ANIME' ? 'animelist' : 'mangalist';
  const url = `https://api.jikan.moe/v4/users/${encodeURIComponent(username)}/${typeEndpoint}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`MyAnimeList user "${username}" was not found or has private list settings.`);
      }
      throw new Error(`MyAnimeList query returned status ${response.status}`);
    }

    const json = await response.json();
    const dataList = json.data || [];

    if (!Array.isArray(dataList)) {
      return [];
    }

    const results: Array<{ score?: number; comment?: string; media: MediaItem }> = [];

    for (const item of dataList) {
      const entry = item.entry || item.node || item;
      const malId = entry.mal_id || entry.id;
      if (!malId) continue;

      const titleStr = entry.title || 'Untitled';
      const imgUrl =
        entry.images?.jpg?.large_image_url ||
        entry.images?.jpg?.image_url ||
        entry.main_picture?.large ||
        entry.main_picture?.medium ||
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80';

      const genres = Array.isArray(entry.genres)
        ? entry.genres.map((g: any) => (typeof g === 'string' ? g : g.name || ''))
        : [];

      // Convert score (MAL uses 1-10, scale to 0-100 for Tsugi internal representation)
      const rawScore = item.score || item.list_status?.score || 0;
      const normalizedScore = rawScore > 0 && rawScore <= 10 ? rawScore * 10 : rawScore;

      results.push({
        score: normalizedScore,
        comment: item.comments || item.notes || item.list_status?.comments || '',
        media: {
          provider: 'mal',
          mediaType,
          externalId: Number(malId),
          title: {
            romaji: titleStr,
            english: titleStr,
          },
          coverImage: {
            large: imgUrl,
            color: '#2e51a2',
          },
          format: mediaType === 'ANIME' ? 'TV' : 'MANGA',
          genres: genres.filter(Boolean),
          averageScore: normalizedScore || 80,
          siteUrl: `https://myanimelist.net/${mediaType.toLowerCase()}/${malId}`,
        },
      });
    }

    return results;
  } catch (err) {
    console.error('Failed to fetch MyAnimeList user collection:', err);
    throw err;
  }
}

