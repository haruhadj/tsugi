import { TsugiList, UserProfile, ScoreFormat, TsugiComment } from '../types';
import { CURATED_POPULAR_TITLES } from './anilist';
import { generateSlug } from './slug';

const STORAGE_KEY_LISTS = 'tsugi_lists_v1';
const STORAGE_KEY_USER = 'tsugi_user_v1';
const STORAGE_KEY_VOTES = 'tsugi_votes_v1';
const STORAGE_KEY_COMMENTS = 'tsugi_comments_v1';
const STORAGE_KEY_COMMENT_VOTES = 'tsugi_comment_votes_v1';

export const POPULAR_CATEGORIES = [
  'All',
  'Action',
  'Adventure',
  'Comedy',
  'Cyberpunk',
  'Drama',
  'Fantasy',
  'Horror',
  'Isekai',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
  'Eclectic / Multi-Genre',
];

export const GENRES_AND_THEMES = POPULAR_CATEGORIES;

const INITIAL_USER: UserProfile = {
  id: 'usr_senpai_01',
  username: 'kenshiro_curates',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  scoreFormat: 'POINT_10',
  bio: 'Curating the finest anime and manga across all eras. 🎌',
  linkedProviders: {
    anilist: { connected: true, username: 'kenshiro_99' },
    mal: { connected: false },
  },
};

const SEED_LISTS: TsugiList[] = [
  {
    id: 'lst_001',
    slug: 'tsu-4k8p-9m2x',
    title: 'Top Tier Psychological Anime That Break Your Mind',
    category: 'Psychological',
    caption: 'Narratives that challenge reality, sanity, and morality with masterclass pacing.',
    authorUsername: 'kenshiro_curates',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    authorId: 'usr_senpai_01',
    isPublished: true,
    scoreFormat: 'POINT_10',
    views: 1420,
    upvotes: 218,
    downvotes: 4,
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: '2026-08-14T10:00:00Z',
    items: [
      {
        id: 'itm_001',
        position: 1,
        media: CURATED_POPULAR_TITLES[1], // Steins;Gate
        score: 98,
        comment: 'The definitive time-travel thriller. The payoff in the final 6 episodes is unforgettable.',
      },
      {
        id: 'itm_002',
        position: 2,
        media: CURATED_POPULAR_TITLES[10], // Monster
        score: 96,
        comment: 'Johan Liebert remains the most chilling antagonist in all of fiction. Pure psychological dread.',
      },
      {
        id: 'itm_003',
        position: 3,
        media: CURATED_POPULAR_TITLES[5], // Attack on Titan
        score: 92,
        comment: 'Evolving from survival horror into a complex moral treatise on nationalism and freedom.',
      },
    ],
  },
  {
    id: 'lst_002',
    slug: 'tsu-7r3v-5n1q',
    title: 'Peak Modern Fantasy & Adventure',
    category: 'Fantasy',
    caption: 'Modern masterpieces reshaping the fantasy genre with sublime character writing.',
    authorUsername: 'frieren_archivist',
    authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    authorId: 'usr_frieren_02',
    isPublished: true,
    scoreFormat: 'POINT_100',
    views: 2890,
    upvotes: 432,
    downvotes: 7,
    createdAt: '2026-08-15T14:30:00Z',
    updatedAt: '2026-08-15T14:30:00Z',
    items: [
      {
        id: 'itm_101',
        position: 1,
        media: CURATED_POPULAR_TITLES[0], // Frieren
        score: 99,
        comment: 'A quiet, deeply emotional contemplation on the passage of time and mortal bonds.',
      },
      {
        id: 'itm_102',
        position: 2,
        media: CURATED_POPULAR_TITLES[2], // Berserk
        score: 97,
        comment: 'The Golden Age arc remains untouchable. Unmatched dark fantasy art and emotional weight.',
      },
      {
        id: 'itm_103',
        position: 3,
        media: CURATED_POPULAR_TITLES[11], // Dungeon Meshi
        score: 91,
        comment: 'Incredible ecology world-building combined with witty, grounded characters and recipes!',
      },
    ],
  },
  {
    id: 'lst_003',
    slug: 'tsu-9b2z-3w8m',
    title: 'Comfort Anime to Heal Your Soul',
    category: 'Slice of Life',
    caption: 'Wholesome, funny, and deeply therapeutic series for rainy evenings.',
    authorUsername: 'bocchi_fanatic',
    authorAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
    authorId: 'usr_bocchi_03',
    isPublished: true,
    scoreFormat: 'POINT_5',
    views: 980,
    upvotes: 185,
    downvotes: 2,
    createdAt: '2026-08-16T08:15:00Z',
    updatedAt: '2026-08-16T08:15:00Z',
    items: [
      {
        id: 'itm_201',
        position: 1,
        media: CURATED_POPULAR_TITLES[4], // Bocchi the Rock
        score: 95,
        comment: 'Hilariously accurate social anxiety animations with legitimately killer indie rock tracks.',
      },
      {
        id: 'itm_202',
        position: 2,
        media: CURATED_POPULAR_TITLES[3], // Spy x Family
        score: 88,
        comment: 'Anya\'s expressions alone carry this joyful, stylish espionage comedy.',
      },
    ],
  },
  {
    id: 'lst_004',
    slug: 'tsu-1p9x-8e4k',
    title: 'Peak Romance & Emotional Resonance',
    category: 'Romance',
    caption: 'Stories where the chemistry, emotional stakes, and music will make you cry.',
    authorUsername: 'shinkai_skies',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    authorId: 'usr_shinkai_04',
    isPublished: true,
    scoreFormat: 'POINT_10',
    views: 1650,
    upvotes: 310,
    downvotes: 5,
    createdAt: '2026-08-16T18:45:00Z',
    updatedAt: '2026-08-16T18:45:00Z',
    items: [
      {
        id: 'itm_301',
        position: 1,
        media: CURATED_POPULAR_TITLES[8], // Your Name
        score: 96,
        comment: 'Radwimps soundtrack plus Makoto Shinkai sky vistas — absolute cinematic perfection.',
      },
      {
        id: 'itm_302',
        position: 2,
        media: CURATED_POPULAR_TITLES[0], // Frieren
        score: 92,
        comment: 'Himmel and Frieren\'s unsaid feelings linger in every quiet moment.',
      },
    ],
  },
  {
    id: 'lst_005',
    slug: 'tsu-5m8k-7x2w',
    title: 'My Ultimate Masterpieces (No Genre Limits)',
    category: 'Eclectic / Multi-Genre',
    derivedGenres: [
      'Sci-Fi',
      'Thriller',
      'Psychological',
      'Drama',
      'Romance',
      'Supernatural',
      'Action',
      'Fantasy',
      'Adventure',
      'Comedy',
      'Slice of Life',
      'Music',
      'Mystery',
    ],
    caption: 'Transcending single-genre boxes: An eclectic pantheon spanning sci-fi thrillers, emotional romance, high-stakes dark fantasy, and acoustic slice-of-life.',
    authorUsername: 'anime_virtuoso',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    authorId: 'usr_virtuoso_05',
    isPublished: true,
    scoreFormat: 'POINT_10',
    views: 3410,
    upvotes: 512,
    downvotes: 8,
    createdAt: '2026-08-16T21:00:00Z',
    updatedAt: '2026-08-16T21:00:00Z',
    items: [
      {
        id: 'itm_501',
        position: 1,
        media: CURATED_POPULAR_TITLES[1], // Steins;Gate (Sci-Fi, Thriller, Psychological, Drama)
        score: 99,
        comment: 'The definitive time-travel psychological thriller. Tonal perfection that rewards every single second.',
      },
      {
        id: 'itm_502',
        position: 2,
        media: CURATED_POPULAR_TITLES[8], // Your Name (Romance, Drama, Supernatural)
        score: 98,
        comment: 'Transcendent body-swap romance with cosmic cinematography and visceral emotional catharsis.',
      },
      {
        id: 'itm_503',
        position: 3,
        media: CURATED_POPULAR_TITLES[5], // Attack on Titan (Action, Drama, Fantasy, Mystery)
        score: 97,
        comment: 'An unparalleled geopolitical dark fantasy epic. The foreshadowing across seasons is unmatched.',
      },
      {
        id: 'itm_504',
        position: 4,
        media: CURATED_POPULAR_TITLES[0], // Frieren (Adventure, Drama, Fantasy)
        score: 96,
        comment: 'High fantasy redefined as a nostalgic, poetic journey on life, mortality, and quiet remembrance.',
      },
      {
        id: 'itm_505',
        position: 5,
        media: CURATED_POPULAR_TITLES[4], // Bocchi the Rock! (Comedy, Music, Slice of Life)
        score: 94,
        comment: 'Experimental animation, hilariously relatable social anxiety, and legitimately incredible indie rock songs.',
      },
      {
        id: 'itm_506',
        position: 6,
        media: CURATED_POPULAR_TITLES[10], // Monster (Drama, Mystery, Psychological, Thriller)
        score: 95,
        comment: 'Naiveaki Urasawa\'s magnum opus exploring the anatomy of human evil in 1990s Central Europe.',
      },
    ],
  },
];

/**
 * Computes the unique set of native genres from all media items within a list.
 * Preserves clean ordering based on frequency across items.
 */
export function getListAggregatedGenres(list: TsugiList): string[] {
  if (!list || !list.items || list.items.length === 0) {
    return list?.derivedGenres || [];
  }

  const frequencyMap: Record<string, number> = {};
  list.items.forEach((item) => {
    if (item.media && Array.isArray(item.media.genres)) {
      item.media.genres.forEach((genre) => {
        const trimmed = genre.trim();
        if (trimmed) {
          frequencyMap[trimmed] = (frequencyMap[trimmed] || 0) + 1;
        }
      });
    }
  });

  // Sort by frequency (most common first), then alphabetically
  const uniqueGenres = Object.keys(frequencyMap).sort((a, b) => {
    const diff = frequencyMap[b] - frequencyMap[a];
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });

  return uniqueGenres.length > 0 ? uniqueGenres : list.derivedGenres || [];
}

/**
 * Calculates all distinct item-level genres present across all published lists
 * with count of how many lists contain that genre.
 */
export function getAllAggregatedGenresWithCounts(
  lists: TsugiList[]
): { name: string; count: number }[] {
  const genreListCountMap: Record<string, number> = {};

  lists
    .filter((l) => l.isPublished)
    .forEach((list) => {
      const genres = getListAggregatedGenres(list);
      genres.forEach((g) => {
        genreListCountMap[g] = (genreListCountMap[g] || 0) + 1;
      });
    });

  return Object.entries(genreListCountMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      const diff = b.count - a.count;
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
}

// Map legacy subjective categories to clean objective Genres & Themes
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'Mind-Bending Psychological': 'Psychological',
  'Dark Fantasy Essentials': 'Fantasy',
  'Cozy Slice of Life': 'Slice of Life',
  'Peak Romance': 'Romance',
  'Top 10 of All Time': 'Eclectic / Multi-Genre',
  'Cyberpunk & Sci-Fi': 'Sci-Fi',
  'Peak Shonen': 'Action',
  'Underrated Hidden Gems': 'Eclectic / Multi-Genre',
  'Beginner Starter Pack': 'Eclectic / Multi-Genre',
  'Horror & Thriller': 'Horror',
  'Music & Melancholy': 'Music',
  'Food & Culinary': 'Slice of Life',
};

function normalizeListCategory(category: string): string {
  if (LEGACY_CATEGORY_MAP[category]) {
    return LEGACY_CATEGORY_MAP[category];
  }
  return category || 'Eclectic / Multi-Genre';
}

export function getStoredLists(): TsugiList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LISTS);
    let lists: TsugiList[] = SEED_LISTS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        lists = parsed;
      }
    } else {
      localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(SEED_LISTS));
    }

    // Ensure derivedGenres are synchronized and categories normalized for all lists
    return lists.map((list) => ({
      ...list,
      category: normalizeListCategory(list.category),
      derivedGenres: getListAggregatedGenres(list),
    }));
  } catch {
    return SEED_LISTS.map((list) => ({
      ...list,
      category: normalizeListCategory(list.category),
      derivedGenres: getListAggregatedGenres(list),
    }));
  }
}

export function saveStoredLists(lists: TsugiList[]): void {
  try {
    // Pre-populate derivedGenres before persisting
    const withDerived = lists.map((list) => ({
      ...list,
      derivedGenres: getListAggregatedGenres(list),
    }));
    localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(withDerived));
  } catch (err) {
    console.error('Failed to save lists to localStorage', err);
  }
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw === 'null' || raw === 'logout') {
      return null;
    }
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(INITIAL_USER));
      return INITIAL_USER;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_USER;
  }
}

export function saveStoredUser(user: UserProfile | null): void {
  try {
    if (user === null) {
      localStorage.setItem(STORAGE_KEY_USER, 'null');
    } else {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
  } catch (err) {
    console.error('Failed to save user to localStorage', err);
  }
}

export function logoutStoredUser(): void {
  try {
    localStorage.setItem(STORAGE_KEY_USER, 'null');
  } catch (err) {
    console.error('Failed to logout user', err);
  }
}

export const PRESET_CURATOR_ACCOUNTS: UserProfile[] = [
  INITIAL_USER,
  {
    id: 'usr_frieren_02',
    username: 'frieren_archivist',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    scoreFormat: 'POINT_100',
    bio: 'Collecting obscure spells and cataloging generational fantasy manga. 📖✨',
    linkedProviders: {
      anilist: { connected: true, username: 'frieren_archive' },
      mal: { connected: false },
    },
  },
  {
    id: 'usr_bocchi_03',
    username: 'bocchi_fanatic',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
    scoreFormat: 'POINT_5',
    bio: 'Guitar solos, anxiety, and slice-of-life comedy. 🎸☕',
    linkedProviders: {
      anilist: { connected: false },
      mal: { connected: true, username: 'gotoh_hitori' },
    },
  },
  {
    id: 'usr_shinkai_04',
    username: 'shinkai_skies',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    scoreFormat: 'POINT_10',
    bio: 'Cinematography nerd. Looking for skies that make you feel something. 🌌',
    linkedProviders: {
      anilist: { connected: true, username: 'radwimps_sky' },
      mal: { connected: true, username: 'shinkai_films' },
    },
  },
];

export function getStoredVotes(): Record<string, 'up' | 'down'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOTES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredVotes(votes: Record<string, 'up' | 'down'>): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOTES, JSON.stringify(votes));
  } catch (err) {
    console.error('Failed to save votes to localStorage', err);
  }
}

export function createNewEmptyList(user: UserProfile): TsugiList {
  const now = new Date().toISOString();
  return {
    id: `lst_${Date.now()}`,
    slug: generateSlug(),
    title: '',
    category: 'Eclectic / Multi-Genre',
    caption: '',
    authorUsername: user.username,
    authorAvatar: user.avatarUrl,
    authorId: user.id,
    isPublished: false,
    scoreFormat: user.scoreFormat,
    views: 0,
    upvotes: 1,
    downvotes: 0,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const SEED_COMMENTS: TsugiComment[] = [
  {
    id: 'cmt_001',
    listSlug: 'tsu-4k8p-9m2x',
    authorId: 'usr_lain_01',
    authorUsername: 'lain_wire',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    content: 'Monster is genuinely terrifying because Johan has no supernatural powers—just pure charisma, philosophy, and manipulation. The Munich Library scene still gives me chills.',
    favoriteTitle: 'Monster',
    upvotes: 42,
    downvotes: 1,
    createdAt: '2026-08-14T12:00:00Z',
  },
  {
    id: 'cmt_002',
    listSlug: 'tsu-4k8p-9m2x',
    parentId: 'cmt_001',
    authorId: 'usr_senpai_01',
    authorUsername: 'kenshiro_curates',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    isCurator: true,
    content: '100% agreed! Urasawa wrote an absolute masterclass in psychological suspense. Have you read 20th Century Boys and Pluto as well?',
    upvotes: 18,
    downvotes: 0,
    createdAt: '2026-08-14T14:30:00Z',
  },
  {
    id: 'cmt_003',
    listSlug: 'tsu-4k8p-9m2x',
    authorId: 'usr_okabe_04',
    authorUsername: 'okabe_lab004',
    authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
    content: 'Steins;Gate at #1 is based. The transition from lighthearted lab banter in the first half to absolute despair in ep 12+ is the greatest tonal shift in anime history. El Psy Kongroo.',
    favoriteTitle: 'Steins;Gate',
    upvotes: 29,
    downvotes: 0,
    createdAt: '2026-08-15T09:15:00Z',
  },
  {
    id: 'cmt_004',
    listSlug: 'tsu-4k8p-9m2x',
    authorId: 'usr_eva_01',
    authorUsername: 'eva_pilot_01',
    authorAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=80',
    content: 'Awesome list. If you expand to top 5, definitely add Serial Experiments Lain and Satoshi Kon\'s Perfect Blue!',
    upvotes: 15,
    downvotes: 1,
    createdAt: '2026-08-15T18:20:00Z',
  },
  {
    id: 'cmt_101',
    listSlug: 'tsu-7r3v-5n1q',
    authorId: 'usr_himmel_01',
    authorUsername: 'himmel_hero',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    content: 'Frieren made me realize high fantasy doesn\'t always need non-stop world-ending stakes to be impactful. Sometimes retracing old footsteps with new companions is the grandest adventure.',
    favoriteTitle: 'Sousou no Frieren',
    upvotes: 68,
    downvotes: 0,
    createdAt: '2026-08-15T16:00:00Z',
  },
  {
    id: 'cmt_102',
    listSlug: 'tsu-7r3v-5n1q',
    authorId: 'usr_guts_02',
    authorUsername: 'guts_dragonslayer',
    authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
    content: 'Susumu Hirasawa\'s soundtrack for Berserk 1997 elevates the Golden Age into pure mythology. Miura\'s cross-hatching and depth will never be matched in the medium.',
    favoriteTitle: 'Berserk',
    upvotes: 54,
    downvotes: 2,
    createdAt: '2026-08-15T19:40:00Z',
  },
  {
    id: 'cmt_103',
    listSlug: 'tsu-7r3v-5n1q',
    authorId: 'usr_senshi_03',
    authorUsername: 'senshi_culinary',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    content: 'Dungeon Meshi getting recognition right next to Berserk is peak. Studio Trigger adapted Ryoko Kui\'s monster ecology with such immense love.',
    favoriteTitle: 'Dungeon Meshi',
    upvotes: 31,
    downvotes: 0,
    createdAt: '2026-08-16T11:10:00Z',
  },
  {
    id: 'cmt_201',
    listSlug: 'tsu-9b2z-3w8m',
    authorId: 'usr_bocchi_09',
    authorUsername: 'guitarhero_fan',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    content: 'Bocchi the Rock literally cured my burnout. The mango box scene, low-poly CGI breakdown, and ep 8 guitar solo were legendary.',
    favoriteTitle: 'Bocchi the Rock!',
    upvotes: 37,
    downvotes: 0,
    createdAt: '2026-08-16T09:00:00Z',
  },
  {
    id: 'cmt_301',
    listSlug: 'tsu-1p9x-8e4k',
    authorId: 'usr_mitsuha_01',
    authorUsername: 'twilight_comet',
    authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    content: 'Your Name\'s climax when "Sparkle" kicks in during the golden hour will forever give me goosebumps no matter how many times I rewatch it.',
    favoriteTitle: 'Kimi no Na wa.',
    upvotes: 45,
    downvotes: 0,
    createdAt: '2026-08-16T20:10:00Z',
  },
];

export function getStoredComments(slug?: string): TsugiComment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMMENTS);
    const voteRaw = localStorage.getItem(STORAGE_KEY_COMMENT_VOTES);
    const userVotes: Record<string, 'up' | 'down'> = voteRaw ? JSON.parse(voteRaw) : {};

    let comments: TsugiComment[] = SEED_COMMENTS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        comments = parsed;
      }
    } else {
      localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(SEED_COMMENTS));
    }

    // Attach current user's votes
    const withVotes = comments.map((c) => ({
      ...c,
      userVote: userVotes[c.id] || null,
    }));

    if (slug) {
      return withVotes.filter((c) => c.listSlug === slug);
    }
    return withVotes;
  } catch {
    return slug ? SEED_COMMENTS.filter((c) => c.listSlug === slug) : SEED_COMMENTS;
  }
}

export function saveStoredComment(comment: TsugiComment): TsugiComment[] {
  try {
    const current = getStoredComments();
    const existingIndex = current.findIndex((c) => c.id === comment.id);
    let updated: TsugiComment[];
    if (existingIndex >= 0) {
      updated = current.map((c) => (c.id === comment.id ? comment : c));
    } else {
      updated = [comment, ...current];
    }
    localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(updated));
    return updated.filter((c) => c.listSlug === comment.listSlug);
  } catch (err) {
    console.error('Failed to save comment', err);
    return [];
  }
}

export function deleteStoredComment(commentId: string, slug: string): TsugiComment[] {
  try {
    const current = getStoredComments();
    // Delete target comment and its children replies
    const updated = current.filter((c) => c.id !== commentId && c.parentId !== commentId);
    localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(updated));
    return updated.filter((c) => c.listSlug === slug);
  } catch (err) {
    console.error('Failed to delete comment', err);
    return [];
  }
}

export function voteStoredComment(
  commentId: string,
  direction: 'up' | 'down',
  slug: string
): TsugiComment[] {
  try {
    const rawVotes = localStorage.getItem(STORAGE_KEY_COMMENT_VOTES);
    const votes: Record<string, 'up' | 'down'> = rawVotes ? JSON.parse(rawVotes) : {};
    const previousVote = votes[commentId];

    const current = getStoredComments();
    const updated = current.map((c) => {
      if (c.id !== commentId) return c;

      let upvotes = c.upvotes;
      let downvotes = c.downvotes;

      if (previousVote === direction) {
        // Toggle off
        delete votes[commentId];
        if (direction === 'up') upvotes = Math.max(0, upvotes - 1);
        if (direction === 'down') downvotes = Math.max(0, downvotes - 1);
      } else {
        // Apply new vote
        if (previousVote === 'up') upvotes = Math.max(0, upvotes - 1);
        if (previousVote === 'down') downvotes = Math.max(0, downvotes - 1);

        if (direction === 'up') upvotes += 1;
        if (direction === 'down') downvotes += 1;

        votes[commentId] = direction;
      }

      return {
        ...c,
        upvotes,
        downvotes,
        userVote: votes[commentId] || null,
      };
    });

    localStorage.setItem(STORAGE_KEY_COMMENT_VOTES, JSON.stringify(votes));
    localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(updated));
    return updated.filter((c) => c.listSlug === slug);
  } catch (err) {
    console.error('Failed to vote comment', err);
    return [];
  }
}

export function resetToSeedData(): { lists: TsugiList[]; user: UserProfile } {
  localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(SEED_LISTS));
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(INITIAL_USER));
  localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(SEED_COMMENTS));
  localStorage.removeItem(STORAGE_KEY_VOTES);
  localStorage.removeItem(STORAGE_KEY_COMMENT_VOTES);
  return { lists: SEED_LISTS, user: INITIAL_USER };
}
