import React, { useState, useMemo } from 'react';
import { TsugiList, UserProfile } from '../types';
import {
  POPULAR_CATEGORIES,
  getStoredComments,
  getListAggregatedGenres,
} from '../lib/storage';
import { ShareModal } from './ShareModal';
import { ScoreBadge } from './ScoreBadge';
import {
  Search,
  Flame,
  Clock,
  Eye,
  ListOrdered,
  Share2,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  Compass,
  ArrowRight,
  LayoutList,
  Rows3,
  LayoutGrid,
  Copy,
  Check,
  Filter,
  Tv,
  BookOpen,
  Plus,
  Info,
  X,
  TrendingUp,
  MessageSquare,
  Tag,
  Hash,
} from 'lucide-react';

interface FeedViewProps {
  lists: TsugiList[];
  user: UserProfile | null;
  onOpenList: (list: TsugiList) => void;
  onVote: (slug: string, direction: 'up' | 'down') => void;
  onCreateNew: () => void;
  onOpenLogin?: () => void;
}

export type FeedDensityMode = 'stream' | 'classic' | 'grid';

export const FeedView: React.FC<FeedViewProps> = ({
  lists,
  user,
  onOpenList,
  onVote,
  onCreateNew,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'ALL' | 'ANIME' | 'MANGA'>('ALL');
  const [sortBy, setSortBy] = useState<'top' | 'newest' | 'views' | 'items'>('top');
  const [feedMode, setFeedMode] = useState<FeedDensityMode>('stream');
  const [searchQuery, setSearchQuery] = useState('');
  const [sharingList, setSharingList] = useState<TsugiList | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const handleCopyLink = async (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/r/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      // ignore
    }
  };

  // Compute live list count for each Genre & Theme
  const genreThemeCounts = useMemo(() => {
    const publishedLists = lists.filter((l) => l.isPublished);
    const counts: Record<string, number> = {
      All: publishedLists.length,
    };

    POPULAR_CATEGORIES.forEach((gt) => {
      if (gt !== 'All') counts[gt] = 0;
    });

    publishedLists.forEach((l) => {
      const listAggregated = l.derivedGenres || getListAggregatedGenres(l);
      const set = new Set([
        (l.category || '').toLowerCase(),
        ...listAggregated.map((g) => g.toLowerCase()),
        ...l.items.flatMap((it) => it.media.genres?.map((g) => g.toLowerCase()) || []),
      ]);

      POPULAR_CATEGORIES.forEach((gt) => {
        if (gt !== 'All') {
          const lower = gt.toLowerCase();
          const isMulti =
            gt === 'Eclectic / Multi-Genre' &&
            (l.category === 'Eclectic / Multi-Genre' || listAggregated.length >= 3);
          if (isMulti || set.has(lower)) {
            counts[gt] = (counts[gt] || 0) + 1;
          }
        }
      });
    });

    return counts;
  }, [lists]);

  // Filter & sort
  const filteredLists = useMemo(() => {
    return lists
      .filter((l) => l.isPublished)
      .filter((l) => {
        const listAggregatedGenres = l.derivedGenres || getListAggregatedGenres(l);

        // 1. Genres & Themes Filter (Unified objective taxonomy)
        if (selectedGenre && selectedGenre !== 'All') {
          const targetLower = selectedGenre.toLowerCase();
          const isMultiMatch =
            selectedGenre === 'Eclectic / Multi-Genre' &&
            (l.category === 'Eclectic / Multi-Genre' || listAggregatedGenres.length >= 3);

          const hasGenreMatch =
            l.category?.toLowerCase() === targetLower ||
            listAggregatedGenres.some((g) => g.toLowerCase() === targetLower) ||
            l.items.some((it) =>
              it.media.genres?.some((g) => g.toLowerCase() === targetLower)
            );

          if (!isMultiMatch && !hasGenreMatch) return false;
        }

        // 2. Media Type (Anime vs Manga)
        if (mediaTypeFilter !== 'ALL') {
          const hasType = l.items.some((it) => it.media.mediaType === mediaTypeFilter);
          if (!hasType) return false;
        }

        // 3. Free-text Search (Title, Caption, Author, Categories, Item Genres, Item Titles)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = l.title.toLowerCase().includes(q);
          const matchCaption = l.caption?.toLowerCase().includes(q) || false;
          const matchAuthor = l.authorUsername.toLowerCase().includes(q);
          const matchCategory = l.category.toLowerCase().includes(q);
          const matchAggregatedGenre = listAggregatedGenres.some((g) =>
            g.toLowerCase().includes(q)
          );
          const matchItems = l.items.some(
            (it) =>
              it.media.title.romaji.toLowerCase().includes(q) ||
              (it.media.title.english && it.media.title.english.toLowerCase().includes(q)) ||
              it.media.genres?.some((g) => g.toLowerCase().includes(q))
          );
          if (
            !matchTitle &&
            !matchCaption &&
            !matchAuthor &&
            !matchCategory &&
            !matchAggregatedGenre &&
            !matchItems
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'top') {
          const scoreA = a.upvotes - a.downvotes;
          const scoreB = b.upvotes - b.downvotes;
          return scoreB - scoreA;
        }
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'views') {
          return b.views - a.views;
        }
        if (sortBy === 'items') {
          return b.items.length - a.items.length;
        }
        return 0;
      });
  }, [lists, selectedGenre, mediaTypeFilter, sortBy, searchQuery]);

  const activeFiltersCount =
    (selectedGenre !== null && selectedGenre !== 'All' ? 1 : 0) +
    (mediaTypeFilter !== 'ALL' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedGenre(null);
    setMediaTypeFilter('ALL');
    setSearchQuery('');
  };

  const handleToggleGenre = (genre: string) => {
    if (selectedGenre === genre || genre === 'All') {
      setSelectedGenre(null);
    } else {
      setSelectedGenre(genre);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Feed Hero */}
      <div className="relative rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Public Discovery Feed</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Community Curated Anime &amp; Manga Lists
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Explore community-ranked recommendations, niche starter packs, and definitive rankings across objective genres and themes. Vote on your favorites or publish your own in seconds.
            </p>
          </div>

          <button
            onClick={onCreateNew}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-950/50 border border-rose-400/30 shrink-0 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create &amp; Share a List</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Reddit UI Grid: Left Main Feed, Right Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT MAIN FEED COLUMN (Reddit Inspired) ================= */}
        <main className="lg:col-span-8 space-y-4">
          {/* Reddit-Style Clean Sort & View Bar */}
          <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
            {/* Sort Tabs (Hot/Top, New, Top Views, Size) */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {[
                { id: 'top', label: 'Top Voted', icon: Flame },
                { id: 'newest', label: 'Newest', icon: Clock },
                { id: 'views', label: 'Most Viewed', icon: Eye },
                { id: 'items', label: 'Longest', icon: ListOrdered },
              ].map((sort) => {
                const Icon = sort.icon;
                const isSelected = sortBy === sort.id;
                return (
                  <button
                    key={sort.id}
                    onClick={() => setSortBy(sort.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sort.label}</span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Switcher + Mobile Filter Drawer Trigger */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Mobile Filter Button */}
              <button
                onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                className={`lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  activeFiltersCount > 0
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
                title="Filters & Search"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-mono">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
                <button
                  onClick={() => setFeedMode('stream')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    feedMode === 'stream'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Card View (Stream)"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFeedMode('classic')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    feedMode === 'classic'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Classic View (Compact Rows)"
                >
                  <Rows3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFeedMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    feedMode === 'grid'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Grid Gallery View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Chips (if any selected) */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400 flex-wrap">
              <span className="font-semibold text-zinc-300">Active Filters:</span>
              {selectedGenre && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                  <Tag className="w-3 h-3" />
                  <span>Genre &amp; Theme: {selectedGenre}</span>
                  <button onClick={() => setSelectedGenre(null)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {mediaTypeFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px] font-bold">
                  <span>Format: {mediaTypeFilter}</span>
                  <button
                    onClick={() => setMediaTypeFilter('ALL')}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px] font-bold">
                  <span>Query: &quot;{searchQuery}&quot;</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-rose-400 hover:text-rose-300 hover:underline ml-auto font-bold text-[11px]"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Feed Content List */}
          {filteredLists.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3 p-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-200">No curations match your criteria</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Try resetting your filters or search query in the sidebar, or publish a new list.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
                <button
                  onClick={onCreateNew}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-colors"
                >
                  Create This List
                </button>
              </div>
            </div>
          ) : feedMode === 'stream' ? (
            /* ================= 1. ONE-COLUMN REDDIT STREAM VIEW ================= */
            <div className="space-y-4">
              {filteredLists.map((list) => {
                const topItems = list.items.slice(0, 5);
                const scoreRank = list.upvotes - list.downvotes;

                return (
                  <div
                    key={list.id}
                    id={`feed-card-${list.slug}`}
                    className="group rounded-2xl bg-zinc-900/70 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 transition-all duration-200 shadow-md hover:shadow-xl overflow-hidden flex flex-row"
                  >
                    {/* Left Reddit-Style Voting Pillar */}
                    <div className="flex flex-col items-center justify-start p-3 sm:p-4 bg-zinc-950/60 border-r border-zinc-800/70 shrink-0 gap-1 select-none">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVote(list.slug, 'up');
                        }}
                        aria-label="Upvote"
                        className={`p-1.5 rounded-lg transition-all ${
                          list.userVote === 'up'
                            ? 'text-rose-400 bg-rose-950/80 ring-1 ring-rose-500/50 scale-110'
                            : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80'
                        }`}
                      >
                        <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                      </button>

                      <span
                        className={`text-xs font-black font-mono my-0.5 ${
                          list.userVote === 'up'
                            ? 'text-rose-400 font-bold'
                            : list.userVote === 'down'
                            ? 'text-indigo-400 font-bold'
                            : 'text-zinc-300'
                        }`}
                      >
                        {scoreRank}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVote(list.slug, 'down');
                        }}
                        aria-label="Downvote"
                        className={`p-1.5 rounded-lg transition-all ${
                          list.userVote === 'down'
                            ? 'text-indigo-400 bg-indigo-950/80 ring-1 ring-indigo-500/50 scale-110'
                            : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80'
                        }`}
                      >
                        <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Right Main List Content */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-3.5 min-w-0">
                      {/* Eyebrow: Category & Curator Handle */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            {list.category}
                          </span>
                          <span className="text-zinc-500">•</span>
                          <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                            {list.authorAvatar ? (
                              <img
                                src={list.authorAvatar}
                                alt={list.authorUsername}
                                className="w-4 h-4 rounded-full object-cover border border-rose-500/40"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center">
                                {list.authorUsername.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span>@{list.authorUsername}</span>
                          </div>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-500 font-mono text-[11px]">
                            /r/{list.slug}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-zinc-500">
                          {list.items.length} titles
                        </span>
                      </div>

                      {/* List Title & Caption */}
                      <div
                        onClick={() => onOpenList(list)}
                        className="cursor-pointer space-y-1.5 group-hover:opacity-95"
                      >
                        <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-rose-400 transition-colors leading-tight">
                          {list.title}
                        </h2>
                        {list.caption && (
                          <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                            {list.caption}
                          </p>
                        )}
                      </div>

                      {/* Auto-Aggregated Multi-Genre Badges Strip */}
                      {(() => {
                        const genres = list.derivedGenres || getListAggregatedGenres(list);
                        if (genres.length === 0) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {genres.slice(0, 5).map((g) => {
                              const isMatched = selectedGenre?.toLowerCase() === g.toLowerCase();
                              return (
                                <button
                                  key={g}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleGenre(g);
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                                    isMatched
                                      ? 'bg-amber-500/30 text-amber-200 border border-amber-500/60 font-bold'
                                      : 'bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                                  }`}
                                >
                                  #{g}
                                </button>
                              );
                            })}
                            {genres.length > 5 && (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                +{genres.length - 5}
                              </span>
                            )}
                            {genres.length >= 3 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 ml-auto hidden sm:inline-flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                Multi-Genre ({genres.length})
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Horizontal Filmstrip of Top Covers */}
                      <div
                        onClick={() => onOpenList(list)}
                        className="cursor-pointer grid grid-cols-3 sm:grid-cols-5 gap-2.5 p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition-all"
                      >
                        {topItems.map((it, idx) => (
                          <div
                            key={it.id}
                            className="group/item relative rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col justify-between"
                          >
                            <div className="relative aspect-[3/4] w-full overflow-hidden">
                              <img
                                src={it.media.coverImage.large}
                                alt={it.media.title.romaji}
                                className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-200"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[10px] font-black text-rose-400">
                                #{idx + 1}
                              </div>
                              {it.score !== undefined && it.score > 0 && (
                                <div className="absolute top-1 right-1">
                                  <ScoreBadge score={it.score} format={list.scoreFormat} size="sm" />
                                </div>
                              )}
                              {it.media.genres && it.media.genres.length > 0 && (
                                <div className="absolute bottom-1 left-1 right-1 pointer-events-none">
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-950/90 text-amber-300 text-[9px] font-medium truncate block border border-zinc-800/60 shadow">
                                    {it.media.genres[0]}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="p-1.5 bg-zinc-950">
                              <p className="text-[11px] font-bold text-zinc-200 truncate">
                                {it.media.title.english || it.media.title.romaji}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Top Titles Text Teaser */}
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                        <span className="font-bold text-zinc-300">Featured:</span>
                        {topItems.map((it, i) => (
                          <React.Fragment key={it.id}>
                            <span className="text-zinc-300 font-medium">
                              #{i + 1} {it.media.title.english || it.media.title.romaji}
                            </span>
                            {i < topItems.length - 1 && <span className="text-zinc-600">•</span>}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Card Bottom Footer: Stats, Share & Open Button */}
                      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 sm:gap-4 text-zinc-400">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Eye className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{list.views} views</span>
                          </span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Layers className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{list.items.length} titles</span>
                          </span>
                          <button
                            onClick={() => onOpenList(list)}
                            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-400 transition-colors"
                            title="View discussion comments"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{getStoredComments(list.slug).length} comments</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleCopyLink(e, list.slug)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              copiedSlug === list.slug
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
                            }`}
                            title="Copy link to clipboard"
                          >
                            {copiedSlug === list.slug ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">
                              {copiedSlug === list.slug ? 'Copied' : 'Copy'}
                            </span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSharingList(list);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors"
                            title="Share list"
                          >
                            <Share2 className="w-3.5 h-3.5 text-rose-400" />
                            <span className="hidden sm:inline">Share</span>
                          </button>

                          <button
                            onClick={() => onOpenList(list)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs shadow transition-colors"
                          >
                            <span>View List</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : feedMode === 'classic' ? (
            /* ================= 2. COMPACT REDDIT CLASSIC ROWS ================= */
            <div className="divide-y divide-zinc-800/80 rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden shadow-md">
              {filteredLists.map((list) => {
                const topCover = list.items[0]?.media?.coverImage?.large;
                const scoreRank = list.upvotes - list.downvotes;

                return (
                  <div
                    key={list.id}
                    onClick={() => onOpenList(list)}
                    className="group cursor-pointer p-3 sm:p-4 hover:bg-zinc-900 transition-colors flex items-center gap-3 sm:gap-4"
                  >
                    {/* Upvote Pill */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 text-xs font-mono font-bold shrink-0"
                    >
                      <button
                        onClick={() => onVote(list.slug, 'up')}
                        className={`hover:text-rose-400 ${
                          list.userVote === 'up' ? 'text-rose-400' : 'text-zinc-500'
                        }`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <span className="px-0.5">{scoreRank}</span>
                      <button
                        onClick={() => onVote(list.slug, 'down')}
                        className={`hover:text-indigo-400 ${
                          list.userVote === 'down' ? 'text-indigo-400' : 'text-zinc-500'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cover Thumbnail */}
                    {topCover ? (
                      <img
                        src={topCover}
                        alt={list.title}
                        className="w-10 h-14 object-cover rounded-lg bg-zinc-950 border border-zinc-800 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                    )}

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          {list.category}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          by @{list.authorUsername}
                        </span>
                        {/* Auto-Aggregated Genre Tags (Micro) */}
                        {(() => {
                          const genres = list.derivedGenres || getListAggregatedGenres(list);
                          return genres.slice(0, 3).map((g) => (
                            <span
                              key={g}
                              className="text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.2 rounded border border-zinc-800 hidden md:inline"
                            >
                              #{g}
                            </span>
                          ));
                        })()}
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                        {list.title}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate">
                        {list.caption || `${list.items.length} curated anime & manga recommendations.`}
                      </p>
                    </div>

                    {/* Right Stats & Action */}
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <div className="hidden sm:flex flex-col items-end text-zinc-500 text-[11px] font-mono">
                        <span>{list.items.length} titles • {list.views} views</span>
                        <span className="text-rose-400/80">{getStoredComments(list.slug).length} comments</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSharingList(list);
                        }}
                        className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800"
                        title="Share"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= 3. MULTI-COLUMN GRID ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLists.map((list) => {
                const topCovers = list.items.slice(0, 4);

                return (
                  <div
                    key={list.id}
                    id={`feed-card-${list.slug}`}
                    className="group relative rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/90 transition-all duration-200 shadow-lg hover:shadow-2xl flex flex-col justify-between overflow-hidden"
                  >
                    <div
                      onClick={() => onOpenList(list)}
                      className="cursor-pointer p-4 pb-0 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 truncate max-w-[180px]">
                          {list.category}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {list.items.length} titles
                        </span>
                      </div>

                      <div className="h-32 rounded-xl bg-zinc-950 border border-zinc-800/80 p-2.5 flex items-center justify-center overflow-hidden relative">
                        <div className="flex items-center -space-x-3 group-hover:-space-x-1 transition-all duration-300">
                          {topCovers.map((item, idx) => (
                            <img
                              key={idx}
                              src={item.media.coverImage.large}
                              alt={item.media.title.romaji}
                              className="w-16 h-24 object-cover rounded-lg border border-zinc-700 shadow-md transform -rotate-1 group-hover:rotate-0 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          ))}
                          {list.items.length > 4 && (
                            <div className="w-16 h-24 rounded-lg bg-zinc-800/90 border border-zinc-700 flex flex-col items-center justify-center text-xs font-mono font-bold text-zinc-300 shadow">
                              <span>+{list.items.length - 4}</span>
                              <span className="text-[9px] text-zinc-400">more</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-zinc-100 group-hover:text-rose-400 transition-colors line-clamp-2 leading-snug">
                          {list.title}
                        </h3>
                        {list.caption && (
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                            {list.caption}
                          </p>
                        )}

                        {/* Auto-Aggregated Genre Cloud Pills */}
                        {(() => {
                          const genres = list.derivedGenres || getListAggregatedGenres(list);
                          if (genres.length === 0) return null;
                          return (
                            <div className="flex flex-wrap items-center gap-1 mt-2">
                              {genres.slice(0, 4).map((g) => (
                                <span
                                  key={g}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-950 text-zinc-400 border border-zinc-800"
                                >
                                  #{g}
                                </span>
                              ))}
                              {genres.length > 4 && (
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  +{genres.length - 4}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="p-4 pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 text-xs text-zinc-400">
                        <span className="truncate">@{list.authorUsername}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <MessageSquare className="w-3 h-3" />
                          {getStoredComments(list.slug).length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVote(list.slug, 'up');
                            }}
                            className={`p-1 rounded ${
                              list.userVote === 'up'
                                ? 'text-rose-400 bg-rose-950/60'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold font-mono px-1 text-zinc-300">
                            {list.upvotes - list.downvotes}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVote(list.slug, 'down');
                            }}
                            className={`p-1 rounded ${
                              list.userVote === 'down'
                                ? 'text-zinc-200 bg-zinc-800'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingList(list);
                          }}
                          className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ================= RIGHT REDDIT-STYLE SIDE PANEL ================= */}
        <aside
          className={`lg:col-span-4 space-y-4 ${
            isMobileFiltersOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* 1. Search Widget */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-md space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-rose-400" />
                <span>Search Curations</span>
              </label>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by anime, manga, title..."
                className="w-full pl-3 pr-8 py-2 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Format / Media Type Segmented Tabs */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-md space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              <span>Media Format</span>
            </label>
            <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              {[
                { id: 'ALL', label: 'All', icon: Sparkles },
                { id: 'ANIME', label: 'Anime', icon: Tv },
                { id: 'MANGA', label: 'Manga', icon: BookOpen },
              ].map((fmt) => {
                const isSelected = mediaTypeFilter === fmt.id;
                const Icon = fmt.icon;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setMediaTypeFilter(fmt.id as any)}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Reddit-Style Unified Genres & Themes Directory */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-rose-400" />
                <span>Genres &amp; Themes</span>
              </label>
              {selectedGenre && (
                <button
                  onClick={() => setSelectedGenre(null)}
                  className="text-[11px] text-rose-400 hover:underline font-bold"
                >
                  Clear ({selectedGenre})
                </button>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Objective anime &amp; manga taxonomy derived directly from curated items and series profiles.
            </p>

            <div className="space-y-1 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
              <button
                onClick={() => setSelectedGenre(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                  selectedGenre === null
                    ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <span className="truncate">🌟 All Genres &amp; Themes</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    selectedGenre === null
                      ? 'bg-rose-500/40 text-white'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {lists.filter((l) => l.isPublished).length}
                </span>
              </button>

              {POPULAR_CATEGORIES.filter((gt) => gt !== 'All').map((genreTheme) => {
                const isSelected = selectedGenre === genreTheme;
                const count = genreThemeCounts[genreTheme] || 0;
                return (
                  <button
                    key={genreTheme}
                    onClick={() => handleToggleGenre(genreTheme)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                      isSelected
                        ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <span className="text-zinc-500 text-[11px]">r/</span>
                      <span>{genreTheme}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-rose-500/40 text-white'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Reddit-Style "About Community" Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-md space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-amber-600 text-white font-mono font-black flex items-center justify-center text-xs shadow">
                次
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">About Tsugi (次)</h4>
                <p className="text-[10px] text-zinc-500">Live Anime &amp; Manga Curation Network</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Curate, score, and rank your favorite anime &amp; manga series with live AniList and MyAnimeList sync. Export high-DPI social graphics and permanent share URLs.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-center">
              <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="block text-sm font-black text-rose-400 font-mono">
                  {lists.filter((l) => l.isPublished).length}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                  Curations
                </span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="block text-sm font-black text-amber-400 font-mono">
                  AniList+MAL
                </span>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                  Live Sync
                </span>
              </div>
            </div>

            <button
              onClick={onCreateNew}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create a Post</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Share modal if open */}
      {sharingList && (
        <ShareModal
          list={sharingList}
          isOpen={true}
          onClose={() => setSharingList(null)}
        />
      )}
    </div>
  );
};
