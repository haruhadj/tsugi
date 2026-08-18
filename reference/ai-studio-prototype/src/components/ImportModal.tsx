import React, { useState } from 'react';
import { TsugiList, UserProfile, MediaType } from '../types';
import {
  fetchAniListUserCollection,
  fetchMALUserCollection,
  CURATED_POPULAR_TITLES,
} from '../lib/anilist';
import { generateSlug } from '../lib/slug';
import { getListAggregatedGenres } from '../lib/storage';
import {
  DownloadCloud,
  Loader2,
  ArrowRight,
  CheckCircle,
  Tv,
  BookOpen,
  Check,
  AlertCircle,
  Zap,
  Settings,
  Link2,
  LogIn,
  User,
} from 'lucide-react';

interface ImportModalProps {
  user: UserProfile | null;
  onImportComplete: (newList: TsugiList) => void;
  onUpdateUser?: (updatedUser: UserProfile) => void;
  onNavigateToSettings?: () => void;
  onOpenLogin?: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  user,
  onImportComplete,
  onNavigateToSettings,
  onOpenLogin,
}) => {
  // Media Type for each provider
  const [anilistMediaType, setAnilistMediaType] = useState<MediaType>('ANIME');
  const [malMediaType, setMalMediaType] = useState<MediaType>('ANIME');

  // Fetching & Results State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedItems, setFetchedItems] = useState<any[]>([]);
  const [lastFetchedProvider, setLastFetchedProvider] = useState<'anilist' | 'mal' | null>(null);
  const [lastFetchedUsername, setLastFetchedUsername] = useState<string>('');
  const [lastFetchedMediaType, setLastFetchedMediaType] = useState<MediaType>('ANIME');

  const anilistInfo = user?.linkedProviders?.anilist;
  const isAnilistConnected = Boolean(anilistInfo?.connected && anilistInfo?.username);

  const malInfo = user?.linkedProviders?.mal;
  const isMalConnected = Boolean(malInfo?.connected && malInfo?.username);

  const hasAnyConnected = isAnilistConnected || isMalConnected;

  // Fetch from linked account (Zero-typing, uses connected profile tracker directly)
  const handleFetchFromLinked = async (provider: 'anilist' | 'mal') => {
    const linkedUser = provider === 'anilist' ? anilistInfo?.username : malInfo?.username;
    const currentMediaType = provider === 'anilist' ? anilistMediaType : malMediaType;
    if (!linkedUser) return;

    setIsLoading(true);
    setError(null);
    setFetchedItems([]);

    try {
      let items: any[] = [];
      if (provider === 'anilist') {
        items = await fetchAniListUserCollection(linkedUser, currentMediaType);
      } else {
        items = await fetchMALUserCollection(linkedUser, currentMediaType);
      }

      if (items.length === 0) {
        setError(
          `No public ${currentMediaType.toLowerCase()} entries found on ${
            provider === 'anilist' ? 'AniList' : 'MyAnimeList'
          } for linked account @${linkedUser}.`
        );
      } else {
        setFetchedItems(items.slice(0, 25)); // Take top 25 entries
        setLastFetchedProvider(provider);
        setLastFetchedUsername(linkedUser);
        setLastFetchedMediaType(currentMediaType);
      }
    } catch (err: any) {
      setError(
        err.message ||
          `Could not fetch from ${
            provider === 'anilist' ? 'AniList' : 'MyAnimeList'
          }. Please verify your username in Settings.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Instant demo import for users testing the pipeline
  const handleInstantDemoImport = async (provider: 'anilist' | 'mal') => {
    const demoUser = provider === 'anilist' ? 'kenshiro_99' : 'shinji_pilot';
    const currentMediaType = provider === 'anilist' ? anilistMediaType : malMediaType;
    setIsLoading(true);
    setError(null);
    setFetchedItems([]);

    try {
      let items: any[] = [];
      if (provider === 'anilist') {
        items = await fetchAniListUserCollection(demoUser, currentMediaType);
      } else {
        items = await fetchMALUserCollection(demoUser, currentMediaType);
      }

      if (items.length === 0) {
        items = CURATED_POPULAR_TITLES.slice(0, 6).map((m, idx) => ({
          score: 90 - idx * 2,
          comment: 'Masterpiece pacing with extraordinary character depth.',
          media: m,
        }));
      }

      setFetchedItems(items.slice(0, 15));
      setLastFetchedProvider(provider);
      setLastFetchedUsername(`${demoUser} (Demo)`);
      setLastFetchedMediaType(currentMediaType);
    } catch (err: any) {
      const items = CURATED_POPULAR_TITLES.slice(0, 6).map((m, idx) => ({
        score: 90 - idx * 2,
        comment: 'Masterpiece pacing with extraordinary character depth.',
        media: m,
      }));
      setFetchedItems(items);
      setLastFetchedProvider(provider);
      setLastFetchedUsername(`${demoUser} (Demo)`);
      setLastFetchedMediaType(currentMediaType);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert fetched items into a new TsugiList
  const handleCreateFromFetched = () => {
    if (fetchedItems.length === 0) return;
    const now = new Date().toISOString();
    const providerName = lastFetchedProvider === 'anilist' ? 'AniList' : 'MyAnimeList';
    const typeName = lastFetchedMediaType === 'ANIME' ? 'Anime' : 'Manga';

    const authorName = user?.username || 'curator';
    const authorAvatar = user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
    const authorId = user?.id || 'usr_guest';
    const scoreFormat = user?.scoreFormat || 'POINT_10';

    const newList: TsugiList = {
      id: `lst_${Date.now()}`,
      slug: generateSlug(),
      title: `${lastFetchedUsername}'s ${providerName} ${typeName} Curations`,
      category: 'Eclectic / Multi-Genre',
      caption: `Imported directly from @${lastFetchedUsername}'s ${providerName} tracker library.`,
      authorUsername: authorName,
      authorAvatar: authorAvatar,
      authorId: authorId,
      isPublished: false,
      scoreFormat: scoreFormat,
      views: 0,
      upvotes: 1,
      downvotes: 0,
      createdAt: now,
      updatedAt: now,
      items: fetchedItems.map((it, idx) => ({
        id: `itm_imp_${Date.now()}_${idx}`,
        position: idx + 1,
        media: it.media,
        score: it.score || it.media.averageScore || 80,
        comment: it.comment || '',
      })),
    };

    newList.derivedGenres = getListAggregatedGenres(newList);
    onImportComplete(newList);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-7">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <DownloadCloud className="w-4 h-4" />
            <span>Tracker Library Import Engine</span>
          </div>
          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Manage Tracker Accounts</span>
            </button>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white">
          Import Library from Connected Tracker Accounts
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Convert your tracked anime and manga library into a ranked Tsugi curation using your linked{' '}
          <strong className="text-sky-400 font-semibold">AniList</strong> or{' '}
          <strong className="text-indigo-400 font-semibold">MyAnimeList</strong> accounts configured in Settings.
        </p>
      </div>

      {/* Notice if no accounts are linked yet */}
      {!hasAnyConnected && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-bold text-amber-300">
                No Tracker Accounts Connected Yet
              </p>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Connect your AniList or MyAnimeList handle in Settings once to enable 1-click library imports.
              </p>
            </div>
          </div>
          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shrink-0 transition-colors shadow-sm"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Go to Settings to Link</span>
            </button>
          )}
        </div>
      )}

      {/* Connected Trackers Section (Primary Hub) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ================= 1. ANILIST CARD ================= */}
        <div
          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-md ${
            isAnilistConnected
              ? 'bg-zinc-900/90 border-sky-500/40 ring-1 ring-sky-500/20'
              : 'bg-zinc-900/60 border-zinc-800'
          }`}
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-500/30">
                  AL
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>AniList</span>
                    {isAnilistConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        <Check className="w-2.5 h-2.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                        Not Linked
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {isAnilistConnected
                      ? `Linked as @${anilistInfo?.username}`
                      : 'Not connected in your profile settings'}
                  </p>
                </div>
              </div>

              {isAnilistConnected && onNavigateToSettings && (
                <button
                  onClick={onNavigateToSettings}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Settings</span>
                </button>
              )}
            </div>

            {/* If Connected: Format Selector */}
            {isAnilistConnected ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-semibold">Select Collection Format:</span>
                  <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
                    <button
                      onClick={() => setAnilistMediaType('ANIME')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        anilistMediaType === 'ANIME'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Tv className="w-3 h-3" />
                      <span>Anime</span>
                    </button>
                    <button
                      onClick={() => setAnilistMediaType('MANGA')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        anilistMediaType === 'MANGA'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Manga</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* If Not Connected: Redirect to Settings CTA */
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Link your AniList username in Settings to sync your completed list, scores, and custom tags.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                  {onNavigateToSettings && (
                    <button
                      onClick={onNavigateToSettings}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-sky-400" />
                      <span>Link AniList in Settings</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleInstantDemoImport('anilist')}
                    className="text-[11px] text-sky-400 hover:underline font-semibold flex items-center justify-center gap-1 py-1"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Try Demo Import</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          {isAnilistConnected && (
            <button
              onClick={() => handleFetchFromLinked('anilist')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isLoading && lastFetchedProvider === 'anilist' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching from AniList...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  <span>
                    Import @{anilistInfo?.username}&apos;s {anilistMediaType === 'ANIME' ? 'Anime' : 'Manga'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* ================= 2. MYANIMELIST CARD ================= */}
        <div
          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-md ${
            isMalConnected
              ? 'bg-zinc-900/90 border-indigo-500/40 ring-1 ring-indigo-500/20'
              : 'bg-zinc-900/60 border-zinc-800'
          }`}
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                  MAL
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>MyAnimeList</span>
                    {isMalConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        <Check className="w-2.5 h-2.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                        Not Linked
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {isMalConnected
                      ? `Linked as @${malInfo?.username}`
                      : 'Not connected in your profile settings'}
                  </p>
                </div>
              </div>

              {isMalConnected && onNavigateToSettings && (
                <button
                  onClick={onNavigateToSettings}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Settings</span>
                </button>
              )}
            </div>

            {/* If Connected: Format Selector */}
            {isMalConnected ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-semibold">Select Collection Format:</span>
                  <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
                    <button
                      onClick={() => setMalMediaType('ANIME')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        malMediaType === 'ANIME'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Tv className="w-3 h-3" />
                      <span>Anime</span>
                    </button>
                    <button
                      onClick={() => setMalMediaType('MANGA')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        malMediaType === 'MANGA'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Manga</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* If Not Connected: Redirect to Settings CTA */
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Link your MyAnimeList handle in Settings to import your animelist or mangalist into ranked curations.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                  {onNavigateToSettings && (
                    <button
                      onClick={onNavigateToSettings}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Link MAL in Settings</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleInstantDemoImport('mal')}
                    className="text-[11px] text-indigo-400 hover:underline font-semibold flex items-center justify-center gap-1 py-1"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Try Demo Import</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          {isMalConnected && (
            <button
              onClick={() => handleFetchFromLinked('mal')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isLoading && lastFetchedProvider === 'mal' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching from MyAnimeList...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  <span>
                    Import @{malInfo?.username}&apos;s {malMediaType === 'ANIME' ? 'Anime' : 'Manga'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Import Notice</p>
            <p className="opacity-90">{error}</p>
            {onNavigateToSettings && (
              <button
                onClick={onNavigateToSettings}
                className="text-[11px] text-rose-300 underline font-semibold mt-1 inline-block"
              >
                Open Settings to check account handles →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Fetched Results Preview */}
      {fetchedItems.length > 0 && (
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Successfully Fetched {fetchedItems.length} Titles
                </h3>
                <p className="text-xs text-zinc-400">
                  From @{lastFetchedUsername}&apos;s{' '}
                  {lastFetchedProvider === 'anilist' ? 'AniList' : 'MyAnimeList'} {lastFetchedMediaType.toLowerCase()} library.
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateFromFetched}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-transform active:scale-95 whitespace-nowrap"
            >
              <span>Convert to Curated Tsugi List</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1 scrollbar-thin">
            {fetchedItems.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs hover:border-zinc-700 transition-colors"
              >
                <img
                  src={it.media.coverImage?.large || it.media.coverImage?.medium}
                  alt="cover"
                  className="w-10 h-14 object-cover rounded-lg bg-zinc-900 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-bold text-zinc-200 truncate">
                    {it.media.title.english || it.media.title.romaji}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="text-amber-400 font-mono font-semibold">
                      {it.score ? `${it.score}/100` : 'Unrated'}
                    </span>
                    <span>•</span>
                    <span className="truncate text-zinc-500">
                      {it.media.genres?.[0] || 'Anime'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
