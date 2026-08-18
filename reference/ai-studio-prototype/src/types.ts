export type MediaType = 'ANIME' | 'MANGA';
export type MediaFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MANGA' | 'NOVEL' | 'ONE_SHOT';
export type Provider = 'anilist' | 'mal';

export type ScoreFormat = 'POINT_100' | 'POINT_10' | 'POINT_5' | 'SMILEY';

export interface MediaItem {
  provider: Provider;
  mediaType: MediaType;
  externalId: number;
  title: {
    romaji: string;
    english?: string;
    native?: string;
  };
  coverImage: {
    large: string;
    medium?: string;
    color?: string;
  };
  bannerImage?: string;
  format?: MediaFormat;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  seasonYear?: number;
  genres: string[];
  averageScore?: number;
  description?: string;
  siteUrl?: string;
}

export interface ListItem {
  id: string; // unique item id in list
  position: number;
  media: MediaItem;
  score?: number; // 0 means unrated, raw value: 0-100 internally
  comment?: string; // ≤ 280 characters
}

export interface TsugiList {
  id: string;
  slug: string; // 12-char unique identifier, e.g. "tsu-7x9q2m4k1p"
  title: string; // list name e.g. "Peak Romance"
  category: string; // category tag
  derivedGenres?: string[]; // auto-aggregated unique genre tags derived from all items
  caption?: string; // short summary
  authorUsername: string;
  authorAvatar?: string;
  authorId: string;
  isPublished: boolean;
  scoreFormat: ScoreFormat;
  views: number;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  items: ListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string;
  scoreFormat: ScoreFormat;
  bio?: string;
  linkedProviders: {
    anilist?: { connected: boolean; username?: string };
    mal?: { connected: boolean; username?: string };
  };
}

export interface TsugiComment {
  id: string;
  listSlug: string;
  authorId: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  parentId?: string | null;
  favoriteTitle?: string;
  isCurator?: boolean;
}

export type ViewTab = 'feed' | 'create' | 'view' | 'dashboard' | 'settings' | 'import';

export interface FilterOptions {
  category: string;
  mediaType: 'ALL' | 'ANIME' | 'MANGA';
  sortBy: 'top' | 'newest' | 'views' | 'items';
  searchQuery: string;
}
