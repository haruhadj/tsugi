import React, { useState, useEffect, useRef } from 'react';
import { MediaItem, MediaType } from '../types';
import { searchAniList } from '../lib/anilist';
import { searchJikan } from '../lib/jikan';
import {
  Search,
  Loader2,
  Plus,
  Check,
  Tv,
  BookOpen,
  Film,
  Sparkles,
  Layers,
  Command,
} from 'lucide-react';

interface MediaSearchInputProps {
  onSelectMedia: (media: MediaItem) => void;
  alreadyAddedIds: number[];
}

export const MediaSearchInput: React.FC<MediaSearchInputProps> = ({
  onSelectMedia,
  alreadyAddedIds,
}) => {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType | 'ALL'>('ALL');
  const [provider, setProvider] = useState<'anilist' | 'mal'>('anilist');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey: Cmd+K, Ctrl+K, or "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        if (provider === 'anilist') {
          const data = await searchAniList(query, mediaType, 8);
          setResults(data);
        } else {
          const data = await searchJikan(query, mediaType, 8);
          setResults(data);
        }
      } catch (err) {
        console.error('Error fetching media:', err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mediaType, provider]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFormatIcon = (format?: string) => {
    if (format === 'MOVIE') return <Film className="w-3 h-3" />;
    if (format === 'MANGA' || format === 'NOVEL') return <BookOpen className="w-3 h-3" />;
    return <Tv className="w-3 h-3" />;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Search Bar with Type & Provider Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-zinc-900/90 rounded-xl border border-zinc-800 focus-within:border-rose-500/60 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-zinc-400" />
          <input
            ref={inputRef}
            id="media-search-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            placeholder="Search anime or manga (e.g. Frieren, Berserk, Steins;Gate)..."
            className="w-full pl-9 pr-14 py-2 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          {/* Keyboard shortcut hint pill */}
          <div className="absolute right-3 flex items-center gap-1 pointer-events-none">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800">
                <span>/</span>
              </kbd>
            )}
          </div>
        </div>

        {/* Source Provider Toggle */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
          <button
            type="button"
            onClick={() => {
              setProvider('anilist');
              setIsFocused(true);
            }}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
              provider === 'anilist'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Search AniList GraphQL API"
          >
            AniList
          </button>
          <button
            type="button"
            onClick={() => {
              setProvider('mal');
              setIsFocused(true);
            }}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
              provider === 'mal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Search MyAnimeList via Jikan REST API"
          >
            MAL
          </button>
        </div>

        {/* Media type filter buttons */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
          {(['ALL', 'ANIME', 'MANGA'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setMediaType(type);
                setIsFocused(true);
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wide transition-colors ${
                mediaType === type
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {type === 'ALL' ? 'All' : type === 'ANIME' ? 'Anime' : 'Manga'}
            </button>
          ))}
        </div>
      </div>

      {/* Results Dropdown */}
      {isFocused && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden max-h-[420px] overflow-y-auto">
          <div className="p-2 border-b border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 bg-zinc-950/60">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-rose-400" />
              {query.trim() ? `Search Results for "${query}"` : 'Popular Recommendations'}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              Provider: {provider === 'anilist' ? 'AniList Live GraphQL' : 'MyAnimeList (Jikan v4)'}
            </span>
          </div>

          {results.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-zinc-400 text-sm">
              No titles found for &quot;{query}&quot;. Try toggling AniList / MAL or searching another keyword.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {results.map((item) => {
                const isAdded = alreadyAddedIds.includes(item.externalId);
                return (
                  <div
                    key={`${item.provider}-${item.externalId}`}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Cover Thumbnail */}
                      <img
                        src={item.coverImage.large}
                        alt={item.title.romaji}
                        className="w-12 h-16 object-cover rounded-md flex-shrink-0 bg-zinc-800 border border-zinc-700/60 shadow-sm"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {getFormatIcon(item.format)}
                            {item.format || item.mediaType}
                          </span>
                          {item.seasonYear && (
                            <span className="text-[11px] text-zinc-400 font-mono">
                              {item.seasonYear}
                            </span>
                          )}
                          {item.averageScore && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                              ★ {item.averageScore}%
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-zinc-100 truncate group-hover:text-rose-400 transition-colors">
                          {item.title.english || item.title.romaji}
                        </h4>
                        {item.title.english && item.title.romaji !== item.title.english && (
                          <p className="text-xs text-zinc-400 truncate font-mono">
                            {item.title.romaji}
                          </p>
                        )}

                        {/* Genres */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {item.genres.slice(0, 3).map((g) => (
                            <span
                              key={g}
                              className="text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.2 rounded"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Add button */}
                    <button
                      type="button"
                      disabled={isAdded}
                      onClick={() => {
                        onSelectMedia(item);
                        // don't close so user can quickly add multiple
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isAdded
                          ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/40 cursor-default'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm hover:scale-105 active:scale-95'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
