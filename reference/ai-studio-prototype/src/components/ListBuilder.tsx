import React, { useState } from 'react';
import { TsugiList, ListItem, MediaItem, ScoreFormat, UserProfile } from '../types';
import { POPULAR_CATEGORIES, getListAggregatedGenres } from '../lib/storage';
import { MediaSearchInput } from './MediaSearchInput';
import { ItemTray } from './ItemTray';
import { SocialCardPreview } from './SocialCardPreview';
import { ShareModal } from './ShareModal';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Save,
  Globe,
  Share2,
  Eye,
  Check,
  Plus,
  Layers,
  ArrowRight,
  AlertCircle,
  Tag,
  Info,
} from 'lucide-react';

interface ListBuilderProps {
  initialList: TsugiList;
  user: UserProfile | null;
  onSaveList: (list: TsugiList, shouldPublish: boolean) => void;
  onViewPublished: (list: TsugiList) => void;
  onOpenLogin?: () => void;
}

export const ListBuilder: React.FC<ListBuilderProps> = ({
  initialList,
  user,
  onSaveList,
  onViewPublished,
  onOpenLogin,
}) => {
  const [list, setList] = useState<TsugiList>(initialList);
  const [showLiveSocialCard, setShowLiveSocialCard] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Category presets
  const categories = POPULAR_CATEGORIES.filter((c) => c !== 'All');

  const handleAddMedia = (media: MediaItem) => {
    const newItem: ListItem = {
      id: `itm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      position: list.items.length + 1,
      media,
      score: media.averageScore || 85,
      comment: '',
    };
    setList((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      updatedAt: new Date().toISOString(),
    }));
    setValidationError(null);
  };

  const handleUpdateScore = (itemId: string, score: number) => {
    setList((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === itemId ? { ...it, score } : it)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateComment = (itemId: string, comment: string) => {
    setList((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === itemId ? { ...it, comment } : it)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= list.items.length) return;
    const newItems = [...list.items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    // re-index positions
    const reordered = newItems.map((item, idx) => ({ ...item, position: idx + 1 }));
    setList((prev) => ({ ...prev, items: reordered, updatedAt: new Date().toISOString() }));
  };

  const handleRemoveItem = (itemId: string) => {
    const remaining = list.items
      .filter((it) => it.id !== itemId)
      .map((it, idx) => ({ ...it, position: idx + 1 }));
    setList((prev) => ({ ...prev, items: remaining, updatedAt: new Date().toISOString() }));
  };

  const handleSaveDraft = () => {
    if (!list.title.trim()) {
      setValidationError('Please give your list a title.');
      return;
    }
    const updated = {
      ...list,
      isPublished: false,
      updatedAt: new Date().toISOString(),
    };
    onSaveList(updated, false);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2000);
  };

  const handlePublish = () => {
    if (!list.title.trim()) {
      setValidationError('Please give your list a title before publishing.');
      return;
    }
    if (list.items.length === 0) {
      setValidationError('Add at least one anime or manga title to publish.');
      return;
    }

    const updated = {
      ...list,
      isPublished: true,
      updatedAt: new Date().toISOString(),
    };

    onSaveList(updated, true);

    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff3366', '#f59e0b', '#8b5cf6', '#10b981'],
      });
    } catch {
      // ignore
    }

    setShowShareModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 text-white font-mono font-bold flex items-center justify-center shadow">
            次
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white">
                {list.title.trim() ? list.title : 'Create Curated List'}
              </h1>
              <span className="font-mono text-xs text-zinc-500">
                /r/{list.slug}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Zero friction: Add titles, write notes, and publish an instant shareable link.
            </p>
          </div>
        </div>

        {/* Builder Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowLiveSocialCard(!showLiveSocialCard)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              showLiveSocialCard
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Social Card</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-950/50 border border-rose-400/30 transition-transform active:scale-95"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Publish List</span>
          </button>
        </div>
      </div>

      {/* Validation alert if error */}
      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Saved feedback toast */}
      {isSavedToast && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>Draft successfully saved to local workspace!</span>
        </div>
      )}

      {/* Social Card Preview Drawer / Collapsible */}
      {showLiveSocialCard && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Live 1200x630 Social Card Preview
            </span>
            <button
              onClick={() => setShowLiveSocialCard(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Hide Preview
            </button>
          </div>
          <SocialCardPreview list={list} />
        </div>
      )}

      {/* Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Metadata & List Settings */}
        <div className="lg:col-span-5 space-y-5">
          {/* List Details Card */}
          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 shadow-md">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              List Metadata &amp; Settings
            </h3>

            {/* List Title Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                List Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={list.title}
                onChange={(e) => {
                  setList((prev) => ({ ...prev, title: e.target.value }));
                  setValidationError(null);
                }}
                placeholder="e.g. 10 Underrated Romance Anime You Must Watch"
                className="w-full px-3.5 py-2.5 bg-zinc-950 rounded-xl border border-zinc-800 text-sm font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30"
              />
            </div>

            {/* Primary Genre & Theme Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Primary Genre &amp; Theme
              </label>
              <select
                value={list.category}
                onChange={(e) => setList((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-3.5 py-2 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-rose-500/60"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Aggregated Native Genres Cloud (Multi-Genre Support) */}
            <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-rose-400" />
                  Auto-Aggregated Genres ({getListAggregatedGenres(list).length})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-medium">
                  Zero-Friction
                </span>
              </div>

              {getListAggregatedGenres(list).length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {getListAggregatedGenres(list).map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500 italic">
                  Add anime/manga items to automatically build this list's multi-genre tag profile.
                </p>
              )}

              <p className="text-[10px] text-zinc-400 leading-normal flex items-start gap-1 pt-1 border-t border-zinc-800/60">
                <Info className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                <span>
                  Items inherit their native genres automatically. Your list will appear when users filter by any of these genres in the public feed!
                </span>
              </p>
            </div>

            {/* Caption / Summary */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  List Caption &amp; Summary (Optional)
                </label>
                <span className="text-[10px] font-mono text-zinc-500">
                  {(list.caption || '').length}/280
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={280}
                value={list.caption || ''}
                onChange={(e) => setList((prev) => ({ ...prev, caption: e.target.value }))}
                placeholder="Brief intro for your list and why you curated these specific titles..."
                className="w-full text-xs p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500/60 resize-none"
              />
            </div>

            {/* Score Format Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Rating Scale Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'POINT_10', label: '10-Point (8.5/10)' },
                  { id: 'POINT_100', label: '100-Point (85%)' },
                  { id: 'POINT_5', label: '5-Star (★★★★☆)' },
                  { id: 'SMILEY', label: 'Mood / Tier' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() =>
                      setList((prev) => ({ ...prev, scoreFormat: fmt.id as ScoreFormat }))
                    }
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                      list.scoreFormat === fmt.id
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Search + Item Tray Workspace */}
        <div className="lg:col-span-7 space-y-4">
          {/* Prominent Media Search Section at Top of Items Workspace */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Add Titles to List
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Search AniList or MAL to add anime or manga titles directly to your ranking.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                Live Search
              </span>
            </div>

            <MediaSearchInput
              onSelectMedia={handleAddMedia}
              alreadyAddedIds={list.items.map((i) => i.media.externalId)}
            />
          </div>

          {/* List Items Header & Tray */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <span>Curated Items</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-bold border border-rose-500/30">
                  {list.items.length} {list.items.length === 1 ? 'title' : 'titles'}
                </span>
              </h2>

              {list.items.length > 0 && (
                <span className="text-xs text-zinc-500">
                  Drag or use arrow buttons to reorder
                </span>
              )}
            </div>

            <ItemTray
              items={list.items}
              scoreFormat={list.scoreFormat}
              onUpdateScore={handleUpdateScore}
              onUpdateComment={handleUpdateComment}
              onMoveItem={handleMoveItem}
              onRemoveItem={handleRemoveItem}
            />
          </div>
        </div>
      </div>

      {/* Share Modal on publish */}
      {showShareModal && (
        <ShareModal
          list={list}
          isOpen={true}
          onClose={() => {
            setShowShareModal(false);
            onViewPublished(list);
          }}
        />
      )}
    </div>
  );
};
