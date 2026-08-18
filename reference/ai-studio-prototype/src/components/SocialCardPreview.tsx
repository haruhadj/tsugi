import React, { useState } from 'react';
import { TsugiList } from '../types';
import { Sparkles, Layers, Download, Copy, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { downloadSocialCardPNG, copySocialCardToClipboard } from '../lib/canvasExport';

interface SocialCardPreviewProps {
  list: TsugiList;
  showActions?: boolean;
}

export const SocialCardPreview: React.FC<SocialCardPreviewProps> = ({ list, showActions = true }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const topCovers = list.items.slice(0, 4).map((i) => i.media.coverImage.large);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      await downloadSocialCardPNG(list);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    setIsExporting(true);
    try {
      const success = await copySocialCardToClipboard(list);
      if (success) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      }
    } catch (err) {
      console.error('Copy image failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="w-full rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-700/80 shadow-2xl p-6 sm:p-8 relative">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header: Brand + Category */}
        <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-amber-600 text-white font-mono font-bold flex items-center justify-center text-sm shadow">
              次
            </div>
            <span className="font-black tracking-tight text-lg text-white font-mono">
              Tsugi <span className="text-xs font-normal text-rose-400">/r/{list.slug}</span>
            </span>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wide">
            {list.category}
          </span>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          {/* Left info */}
          <div className="md:col-span-7 space-y-4">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight tracking-tight">
              {list.title || 'Untitled Anime Curation'}
            </h2>

            {list.caption && (
              <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                {list.caption}
              </p>
            )}

            {/* Curator Profile */}
            <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/80">
              {list.authorAvatar ? (
                <img
                  src={list.authorAvatar}
                  alt={list.authorUsername}
                  className="w-8 h-8 rounded-full object-cover border border-rose-500/50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-rose-600/30 text-rose-300 flex items-center justify-center font-bold text-xs">
                  {list.authorUsername.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-zinc-200">
                  Curated by @{list.authorUsername}
                </p>
                <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                  <span>{list.items.length} titles</span>
                  <span>•</span>
                  <span>{list.upvotes} upvotes</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Cover Collage */}
          <div className="md:col-span-5 flex items-center justify-center">
            {topCovers.length > 0 ? (
              <div className="flex items-center -space-x-4 hover:space-x-1 transition-all duration-300">
                {topCovers.map((cover, idx) => (
                  <img
                    key={idx}
                    src={cover}
                    alt={`Cover ${idx + 1}`}
                    className="w-20 h-28 sm:w-24 sm:h-36 object-cover rounded-xl border-2 border-zinc-800 shadow-xl transform -rotate-2 hover:rotate-0 hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            ) : (
              <div className="w-32 h-44 rounded-xl border-2 border-dashed border-zinc-700/60 flex flex-col items-center justify-center text-zinc-500 gap-2">
                <Layers className="w-6 h-6" />
                <span className="text-[11px]">Covers Preview</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer / Watermark */}
        <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1 text-zinc-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Live link ready for X, Discord &amp; WhatsApp
          </span>
          <span className="font-mono text-zinc-400">1200 × 630 OpenGraph Ready</span>
        </div>
      </div>

      {/* Action Bar for Social Card */}
      {showActions && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <ImageIcon className="w-4 h-4 text-rose-400" />
            <span>Generate 1200×630 HD Social Graphic</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isExporting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                copiedImage
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
            >
              {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedImage ? 'Image Copied!' : 'Copy Image'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PNG</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
