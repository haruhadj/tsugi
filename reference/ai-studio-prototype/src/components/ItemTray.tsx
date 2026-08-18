import React from 'react';
import { ListItem, ScoreFormat } from '../types';
import { ScoreInput } from './ScoreInput';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Tv,
  BookOpen,
  Film,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

interface ItemTrayProps {
  items: ListItem[];
  scoreFormat: ScoreFormat;
  onUpdateScore: (itemId: string, score: number) => void;
  onUpdateComment: (itemId: string, comment: string) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onRemoveItem: (itemId: string) => void;
}

export const ItemTray: React.FC<ItemTrayProps> = ({
  items,
  scoreFormat,
  onUpdateScore,
  onUpdateComment,
  onMoveItem,
  onRemoveItem,
}) => {
  const getFormatIcon = (format?: string) => {
    if (format === 'MOVIE') return <Film className="w-3 h-3" />;
    if (format === 'MANGA' || format === 'NOVEL') return <BookOpen className="w-3 h-3" />;
    return <Tv className="w-3 h-3" />;
  };

  if (items.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed border-zinc-800 rounded-2xl text-center bg-zinc-900/30">
        <p className="text-zinc-300 font-semibold text-sm mb-1">
          Your list has no titles yet
        </p>
        <p className="text-zinc-500 text-xs max-w-sm mx-auto">
          Use the search bar above to find and add anime or manga. You can rate and write custom notes for each.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const commentLength = item.comment?.length || 0;
        const isMaxed = commentLength >= 280;

        return (
          <div
            key={item.id}
            id={`item-card-${item.id}`}
            className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90 shadow-md hover:border-zinc-700/80 transition-all"
          >
            {/* Header row: Position, Media summary, Reordering, Delete */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Position badge */}
                <div className="w-7 h-7 rounded-lg bg-zinc-800 text-rose-400 font-mono font-black text-xs flex items-center justify-center border border-zinc-700/70 shrink-0">
                  #{index + 1}
                </div>

                {/* Cover & Title */}
                <img
                  src={item.media.coverImage.large}
                  alt={item.media.title.romaji}
                  className="w-12 h-16 object-cover rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 shadow"
                  referrerPolicy="no-referrer"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {getFormatIcon(item.media.format)}
                      {item.media.format || item.media.mediaType}
                    </span>
                    {item.media.seasonYear && (
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {item.media.seasonYear}
                      </span>
                    )}
                    {item.media.siteUrl && (
                      <a
                        href={item.media.siteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-rose-400 hover:underline flex items-center gap-0.5"
                      >
                        AniList <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-zinc-100 truncate">
                    {item.media.title.english || item.media.title.romaji}
                  </h4>
                  {item.media.title.english && item.media.title.romaji !== item.media.title.english && (
                    <p className="text-xs text-zinc-400 truncate font-mono">
                      {item.media.title.romaji}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons: Move Up / Down / Remove */}
              <div className="flex items-center gap-1 shrink-0 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onMoveItem(index, index - 1)}
                  aria-label="Move Up"
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => onMoveItem(index, index + 1)}
                  aria-label="Move Down"
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="w-px h-3 bg-zinc-800 mx-0.5" />
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label="Delete"
                  className="p-1 rounded text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Score input & Commentary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-zinc-800/60">
              {/* Score section */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Your Rating
                </label>
                <ScoreInput
                  value={item.score}
                  format={scoreFormat}
                  onChange={(val) => onUpdateScore(item.id, val)}
                />
              </div>

              {/* Comment / Note section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <MessageSquare className="w-3 h-3 text-rose-400" />
                    Curator Note (≤280 chars)
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      isMaxed ? 'text-rose-400 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {commentLength}/280
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={280}
                  value={item.comment || ''}
                  onChange={(e) => onUpdateComment(item.id, e.target.value)}
                  placeholder="What makes this title stand out? Why is it on your list?"
                  className="w-full text-xs p-2 rounded-lg bg-zinc-950/90 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500/50 resize-none transition-colors"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
