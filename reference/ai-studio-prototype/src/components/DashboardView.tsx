import React, { useState } from 'react';
import { TsugiList, UserProfile } from '../types';
import { ShareModal } from './ShareModal';
import {
  PlusCircle,
  Eye,
  ThumbsUp,
  Globe,
  FileEdit,
  Trash2,
  Share2,
  Copy,
  Layers,
  Sparkles,
  ExternalLink,
  BookOpen,
  Tv,
  LogIn,
  User,
} from 'lucide-react';

interface DashboardViewProps {
  lists: TsugiList[];
  user: UserProfile | null;
  onEditList: (list: TsugiList) => void;
  onViewList: (list: TsugiList) => void;
  onTogglePublish: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onDuplicateList: (list: TsugiList) => void;
  onCreateNew: () => void;
  onOpenLogin?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  lists,
  user,
  onEditList,
  onViewList,
  onTogglePublish,
  onDeleteList,
  onDuplicateList,
  onCreateNew,
  onOpenLogin,
}) => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'PUBLISHED' | 'DRAFTS'>('ALL');
  const [sharingList, setSharingList] = useState<TsugiList | null>(null);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="p-8 sm:p-10 rounded-3xl bg-zinc-900/80 border border-zinc-800 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 text-rose-400 mx-auto flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white">Log in to view your Curations</h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Create, rank, edit drafts, and monitor impressions for your anime and manga tier curations by logging in to Tsugi.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-orange-950/40 transition-transform active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In to View Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User's own lists (or all stored locally for current user)
  const userLists = lists.filter((l) => l.authorId === user.id || l.authorUsername === user.username);

  // Aggregate metrics
  const totalViews = userLists.reduce((acc, l) => acc + l.views, 0);
  const totalUpvotes = userLists.reduce((acc, l) => acc + l.upvotes, 0);
  const totalItemsCurated = userLists.reduce((acc, l) => acc + l.items.length, 0);

  const displayedLists = userLists.filter((l) => {
    if (filterTab === 'PUBLISHED') return l.isPublished;
    if (filterTab === 'DRAFTS') return !l.isPublished;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-rose-500/50 shadow-md"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                @{user.username}&apos;s Curation Desk
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {user.bio || 'Manage your published anime lists, drafts, and community rankings.'}
            </p>
          </div>
        </div>

        <button
          onClick={onCreateNew}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-rose-950/40 border border-rose-400/30 shrink-0 transition-transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Curated List</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Lists', value: userLists.length, icon: Layers, color: 'text-rose-400' },
          { label: 'Community Views', value: totalViews, icon: Eye, color: 'text-amber-400' },
          { label: 'Upvotes Received', value: totalUpvotes, icon: ThumbsUp, color: 'text-emerald-400' },
          { label: 'Titles Curated', value: totalItemsCurated, icon: Tv, color: 'text-indigo-400' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1 shadow-sm"
            >
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>{stat.label}</span>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {stat.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold">
          {[
            { id: 'ALL', label: `All Lists (${userLists.length})` },
            { id: 'PUBLISHED', label: `Published (${userLists.filter((l) => l.isPublished).length})` },
            { id: 'DRAFTS', label: `Drafts (${userLists.filter((l) => !l.isPublished).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterTab === tab.id
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lists Collection */}
      {displayedLists.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-200">No lists in this tab</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {filterTab === 'DRAFTS'
              ? 'You have no draft lists. All your curations are published!'
              : 'Create your first anime or manga list and share it with the community.'}
          </p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-colors"
          >
            Create List Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedLists.map((list) => {
            const topCovers = list.items.slice(0, 4);

            return (
              <div
                key={list.id}
                id={`dash-item-${list.slug}`}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md"
              >
                {/* Left: Covers + Info */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Small covers thumbnail stack */}
                  <div className="w-16 h-20 rounded-xl bg-zinc-950 border border-zinc-800 p-1 flex items-center justify-center shrink-0 overflow-hidden relative">
                    {topCovers.length > 0 ? (
                      <img
                        src={topCovers[0].media.coverImage.large}
                        alt="cover"
                        className="w-full h-full object-cover rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <BookOpen className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>

                  {/* List metadata */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30">
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

                    <h3
                      onClick={() => onViewList(list)}
                      className="text-base font-bold text-white hover:text-rose-400 transition-colors cursor-pointer truncate"
                    >
                      {list.title || 'Untitled List'}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>{list.items.length} titles</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-zinc-500" />
                        {list.views}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-zinc-500" />
                        {list.upvotes}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-wrap self-end md:self-center shrink-0">
                  {/* Toggle publish button */}
                  <button
                    type="button"
                    onClick={() => onTogglePublish(list.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      list.isPublished
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40 hover:bg-emerald-900/60'
                    }`}
                  >
                    {list.isPublished ? 'Unpublish' : 'Publish to Feed'}
                  </button>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => onEditList(list)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {/* Share button */}
                  <button
                    type="button"
                    onClick={() => setSharingList(list)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                    aria-label="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  {/* Duplicate / Clone */}
                  <button
                    type="button"
                    onClick={() => onDuplicateList(list)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                    aria-label="Duplicate"
                    title="Clone as template"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${list.title}"?`)) {
                        onDeleteList(list.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
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
