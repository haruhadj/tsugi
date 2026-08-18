import React, { useState, useMemo } from 'react';
import { TsugiList, UserProfile, ListItem } from '../types';
import { ScoreBadge } from './ScoreBadge';
import { ShareModal } from './ShareModal';
import { CommentSection } from './CommentSection';
import { getStoredComments, getListAggregatedGenres } from '../lib/storage';
import {
  ArrowLeft,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Tv,
  BookOpen,
  Film,
  ExternalLink,
  Eye,
  Calendar,
  Sparkles,
  Copy,
  Check,
  PlusCircle,
  MessageSquare,
  LayoutList,
  Layers,
  Grid3X3,
  Download,
  Loader2,
  Tag,
  X,
  Info,
} from 'lucide-react';
import { downloadSocialCardPNG } from '../lib/canvasExport';

interface RecViewProps {
  list: TsugiList;
  user: UserProfile | null;
  onBack: () => void;
  onVote: (slug: string, direction: 'up' | 'down') => void;
  onCloneList?: (list: TsugiList) => void;
  onOpenLogin?: () => void;
}

type ViewLayoutMode = 'ranked' | 'tier' | 'grid';

export const RecView: React.FC<RecViewProps> = ({
  list,
  user,
  onBack,
  onVote,
  onCloneList,
  onOpenLogin,
}) => {
  const [layoutMode, setLayoutMode] = useState<ViewLayoutMode>('ranked');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExportingCard, setIsExportingCard] = useState(false);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string | null>(null);

  const getFormatIcon = (format?: string) => {
    if (format === 'MOVIE') return <Film className="w-3.5 h-3.5" />;
    if (format === 'MANGA' || format === 'NOVEL') return <BookOpen className="w-3.5 h-3.5" />;
    return <Tv className="w-3.5 h-3.5" />;
  };

  const handleQuickCopy = async () => {
    const url = `${window.location.origin}/r/${list.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleQuickDownloadCard = async () => {
    setIsExportingCard(true);
    try {
      await downloadSocialCardPNG(list);
    } catch (err) {
      console.error('Download card failed:', err);
    } finally {
      setIsExportingCard(false);
    }
  };

  const formattedDate = new Date(list.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const aggregatedGenres = useMemo(() => {
    return list.derivedGenres || getListAggregatedGenres(list);
  }, [list]);

  const displayedItems = useMemo(() => {
    if (!selectedGenreFilter) return list.items;
    return list.items.filter((it) =>
      it.media.genres?.some((g) => g.toLowerCase() === selectedGenreFilter.toLowerCase())
    );
  }, [list.items, selectedGenreFilter]);

  // Calculate items bucketed by Tier for Matrix View
  const tierBuckets: Record<string, { label: string; color: string; bg: string; items: ListItem[] }> = {
    S: { label: 'S Tier (Masterpiece)', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', items: [] },
    A: { label: 'A Tier (Exceptional)', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', items: [] },
    B: { label: 'B Tier (Great)', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30', items: [] },
    C: { label: 'C Tier (Good)', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', items: [] },
    D: { label: 'D / Unrated Tier', color: 'text-zinc-400', bg: 'bg-zinc-800/40 border-zinc-700/30', items: [] },
  };

  displayedItems.forEach((it) => {
    const score = it.score || (it.media.averageScore ? it.media.averageScore : 70);
    if (score >= 90) tierBuckets.S.items.push(it);
    else if (score >= 80) tierBuckets.A.items.push(it);
    else if (score >= 70) tierBuckets.B.items.push(it);
    else if (score >= 60) tierBuckets.C.items.push(it);
    else tierBuckets.D.items.push(it);
  });

  const handleToggleGenreFilter = (genre: string) => {
    if (selectedGenreFilter === genre) {
      setSelectedGenreFilter(null);
    } else {
      setSelectedGenreFilter(genre);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Top navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handleQuickDownloadCard}
            disabled={isExportingCard}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-800 transition-colors disabled:opacity-50"
            title="Download high resolution 1200x630 social card PNG"
          >
            {isExportingCard ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>Export Card PNG</span>
          </button>

          <button
            onClick={handleQuickCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              copiedLink
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 border border-rose-400/30 transition-all hover:scale-105"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="relative rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800/90 p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Category Tag & Slug */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wide">
              {list.category}
            </span>
            <span className="font-mono text-xs text-zinc-500">
              /r/{list.slug}
            </span>
            {list.isPublished ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-600/30">
                Published
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-600/30">
                Draft
              </span>
            )}
          </div>

          {/* List Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
            {list.title}
          </h1>

          {/* Caption / Description */}
          {list.caption && (
            <p className="text-sm sm:text-base text-zinc-300 max-w-3xl leading-relaxed">
              {list.caption}
            </p>
          )}

          {/* Auto-Aggregated Genre Spectrum (Mixed-Genre Support) */}
          {aggregatedGenres.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Genre Spectrum ({aggregatedGenres.length} auto-aggregated genres)</span>
                </div>
                {aggregatedGenres.length >= 3 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    <Sparkles className="w-3 h-3" />
                    Mixed-Genre Curation
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {aggregatedGenres.map((genre) => {
                  const isSelected = selectedGenreFilter?.toLowerCase() === genre.toLowerCase();
                  return (
                    <button
                      key={genre}
                      onClick={() => handleToggleGenreFilter(genre)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-amber-500/30 text-amber-200 border border-amber-500/70 font-bold shadow-sm ring-1 ring-amber-500/50'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:text-white'
                      }`}
                      title={`Filter list to ${genre} titles`}
                    >
                      #{genre}
                    </button>
                  );
                })}
                {selectedGenreFilter && (
                  <button
                    onClick={() => setSelectedGenreFilter(null)}
                    className="px-2 py-1 rounded-lg text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline ml-1"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Curator & Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
            {/* Curator user */}
            <div className="flex items-center gap-3">
              {list.authorAvatar ? (
                <img
                  src={list.authorAvatar}
                  alt={list.authorUsername}
                  className="w-10 h-10 rounded-full object-cover border-2 border-rose-500/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-rose-600/30 text-rose-300 flex items-center justify-center font-bold text-sm border border-rose-500/30">
                  {list.authorUsername.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-white">
                  @{list.authorUsername}
                </p>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formattedDate}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {list.views} views
                  </span>
                  <span>•</span>
                  <span>{list.items.length} titles</span>
                  <span>•</span>
                  <a
                    href="#comments-section"
                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Discussion</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Voting buttons */}
            <div className="flex items-center gap-2 bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800 shadow">
              <button
                onClick={() => onVote(list.slug, 'up')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  list.userVote === 'up'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{list.upvotes}</span>
              </button>

              <button
                onClick={() => onVote(list.slug, 'down')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  list.userVote === 'down'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Items Section Header & View Layout Switcher */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Curated Titles</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                {displayedItems.length}{selectedGenreFilter ? ` / ${list.items.length}` : ''}
              </span>
            </h2>
          </div>

          {/* Layout Mode Controls & Clone Action */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setLayoutMode('ranked')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  layoutMode === 'ranked'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Ranked Editorial List"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Ranked</span>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('tier')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  layoutMode === 'tier'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="S/A/B/C/D Tier Matrix"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tier Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  layoutMode === 'grid'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Poster Bento Gallery"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Gallery</span>
              </button>
            </div>

            {onCloneList && (
              <button
                onClick={() => onCloneList(list)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Clone List</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Genre Filter Info Bar */}
        {selectedGenreFilter && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Filtering by genre: <strong className="text-white font-bold">#{selectedGenreFilter}</strong> ({displayedItems.length} of {list.items.length} titles)
              </span>
            </div>
            <button
              onClick={() => setSelectedGenreFilter(null)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-bold text-[11px] transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Show All Titles</span>
            </button>
          </div>
        )}

        {/* 1. Ranked Editorial View */}
        {layoutMode === 'ranked' && (
          <div className="space-y-4">
            {displayedItems.map((item, index) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all shadow-md flex flex-col md:flex-row items-start gap-4 sm:gap-6"
              >
                {/* Position Number */}
                <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-800 text-rose-400 font-mono font-black text-sm shrink-0 border border-zinc-700">
                  #{index + 1}
                </div>

                {/* Cover Art */}
                <div className="relative group shrink-0">
                  <img
                    src={item.media.coverImage.large}
                    alt={item.media.title.romaji}
                    className="w-24 h-36 sm:w-28 sm:h-40 object-cover rounded-xl bg-zinc-950 border border-zinc-800 shadow-md group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className="sm:hidden absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 font-mono text-xs font-bold text-rose-400">
                    #{index + 1}
                  </div>
                </div>

                {/* Detail Info */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {getFormatIcon(item.media.format)}
                        {item.media.format || item.media.mediaType}
                      </span>
                      {item.media.seasonYear && (
                        <span className="text-xs text-zinc-400 font-mono">
                          {item.media.seasonYear}
                        </span>
                      )}
                      {item.media.episodes && (
                        <span className="text-xs text-zinc-400 font-mono">
                          {item.media.episodes} eps
                        </span>
                      )}
                      {item.media.chapters && (
                        <span className="text-xs text-zinc-400 font-mono">
                          {item.media.chapters} chs
                        </span>
                      )}
                    </div>

                    {/* Curator Score Badge */}
                    {item.score !== undefined && item.score > 0 && (
                      <ScoreBadge score={item.score} format={list.scoreFormat} size="md" />
                    )}
                  </div>

                  {/* Titles */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {item.media.title.english || item.media.title.romaji}
                    </h3>
                    {item.media.title.english && item.media.title.romaji !== item.media.title.english && (
                      <p className="text-xs text-zinc-400 font-mono">
                        {item.media.title.romaji}
                      </p>
                    )}
                  </div>

                  {/* Genres (Interactive Filter Chips) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.media.genres.map((g) => {
                      const isMatched = selectedGenreFilter?.toLowerCase() === g.toLowerCase();
                      return (
                        <button
                          key={g}
                          onClick={() => handleToggleGenreFilter(g)}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${
                            isMatched
                              ? 'bg-amber-500/30 text-amber-200 border border-amber-500/60 font-bold'
                              : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                          }`}
                        >
                          #{g}
                        </button>
                      );
                    })}
                  </div>

                  {/* Curator Comment / Review Note */}
                  {item.comment && (
                    <div className="mt-3 p-3 rounded-xl bg-zinc-950/80 border border-rose-500/20 text-xs sm:text-sm text-zinc-200 leading-relaxed relative">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">
                        <MessageSquare className="w-3 h-3" />
                        Curator Commentary
                      </div>
                      &quot;{item.comment}&quot;
                    </div>
                  )}

                  {/* External link */}
                  <div className="pt-1">
                    {item.media.siteUrl && (
                      <a
                        href={item.media.siteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline"
                      >
                        <span>View on {item.media.provider === 'mal' ? 'MyAnimeList' : 'AniList'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. Tier Matrix View */}
        {layoutMode === 'tier' && (
          <div className="space-y-4">
            {Object.entries(tierBuckets).map(([key, bucket]) => {
              if (bucket.items.length === 0) return null;
              return (
                <div
                  key={key}
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col md:flex-row items-start gap-4 ${bucket.bg}`}
                >
                  {/* Tier Label Pillar */}
                  <div className="w-full md:w-36 shrink-0 flex md:flex-col items-center justify-between md:justify-center p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center">
                    <span className={`text-2xl sm:text-3xl font-black font-mono ${bucket.color}`}>
                      {key}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      {bucket.items.length} {bucket.items.length === 1 ? 'title' : 'titles'}
                    </span>
                  </div>

                  {/* Items in Tier */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
                    {bucket.items.map((item) => (
                      <div
                        key={item.id}
                        className="group relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow hover:border-rose-500/50 transition-all"
                      >
                        <img
                          src={item.media.coverImage.large}
                          alt={item.media.title.romaji}
                          className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                        <div className="p-2 space-y-1">
                          <p className="text-xs font-bold text-white truncate">
                            {item.media.title.english || item.media.title.romaji}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 uppercase font-mono">
                              #{item.position}
                            </span>
                            {item.score !== undefined && item.score > 0 && (
                              <ScoreBadge score={item.score} format={list.scoreFormat} size="sm" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Bento Poster Gallery View */}
        {layoutMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayedItems.map((item, index) => (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-lg hover:border-zinc-700 transition-all hover:scale-[1.02]"
              >
                {/* Poster Cover */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-950">
                  <img
                    src={item.media.coverImage.large}
                    alt={item.media.title.romaji}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {/* Position Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-xs font-mono font-bold text-rose-400 border border-zinc-800">
                    #{index + 1}
                  </div>

                  {/* Rating Tag */}
                  {item.score !== undefined && item.score > 0 && (
                    <div className="absolute top-2 right-2">
                      <ScoreBadge score={item.score} format={list.scoreFormat} size="sm" />
                    </div>
                  )}

                  {/* Primary Genre Tag */}
                  {item.media.genres && item.media.genres.length > 0 && (
                    <div className="absolute top-2 left-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleGenreFilter(item.media.genres[0]);
                        }}
                        className="px-1.5 py-0.5 rounded bg-black/80 text-amber-300 font-mono text-[9px] font-bold border border-zinc-800 hover:bg-amber-950/80"
                      >
                        {item.media.genres[0]}
                      </button>
                    </div>
                  )}

                  {/* Bottom gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
                </div>

                {/* Caption / Title */}
                <div className="p-3 space-y-1 bg-zinc-900">
                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {item.media.title.english || item.media.title.romaji}
                  </h4>
                  <p className="text-[10px] text-zinc-500 flex items-center justify-between">
                    <span>{item.media.format || item.media.mediaType}</span>
                    <span>{item.media.seasonYear || ''}</span>
                  </p>
                  {item.comment && (
                    <p className="text-[11px] text-zinc-400 italic line-clamp-2 pt-1 border-t border-zinc-800/60">
                      &quot;{item.comment}&quot;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community Comments & Discussion Section */}
      <CommentSection list={list} user={user} onOpenLogin={onOpenLogin} />

      {/* Share Modal */}
      <ShareModal
        list={list}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};

