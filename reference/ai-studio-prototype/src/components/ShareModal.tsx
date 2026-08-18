import React, { useState } from 'react';
import { TsugiList } from '../types';
import { SocialCardPreview } from './SocialCardPreview';
import {
  X,
  Copy,
  Check,
  Share2,
  QrCode,
  Sparkles,
  ExternalLink,
  MessageCircle,
  FileCode,
} from 'lucide-react';

interface ShareModalProps {
  list: TsugiList;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ list, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'card' | 'qr' | 'embed'>('link');

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tsugi.app';
  const shareUrl = `${currentOrigin}/r/${list.slug}`;
  const shareText = `Check out my anime & manga list "${list.title}" on Tsugi (次)! 🎌\n\n${shareUrl}`;

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${list.title} - Tsugi (次)`,
          text: `Check out "${list.title}" on Tsugi (次)!`,
          url: shareUrl,
        });
      } catch (err) {
        // User dismissed or aborted share
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleCopyMarkdown = async () => {
    const md = `### [${list.title}](${shareUrl})\n*Category: ${list.category} | Curated by @${list.authorUsername}*\n\n${list.items
      .map(
        (it, idx) =>
          `${idx + 1}. **${it.media.title.english || it.media.title.romaji}** (${it.media.format || it.media.mediaType}) - ${
            it.score ? `${it.score}/100` : 'Unrated'
          }\n   ${it.comment ? `> ${it.comment}` : ''}`
      )
      .join('\n\n')}`;

    try {
      await navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2500);
    } catch (err) {
      console.error('Failed to copy markdown', err);
    }
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Check out my curated anime list "${list.title}" on Tsugi (次)! 🎌 #anime #manga`
  )}&url=${encodeURIComponent(shareUrl)}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Check out "${list.title}" on Tsugi: ${shareUrl}`
  )}`;

  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(
    shareUrl
  )}&title=${encodeURIComponent(`[Tsugi Curated List] ${list.title}`)}`;

  // Quick SVG QR Code generator URL using standard safe qr generator api or inline
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    shareUrl
  )}&bgcolor=18-18-1b&color=ff-33-66`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share List</h3>
              <p className="text-xs text-zinc-400">
                Direct link, social intents & instant rich social cards
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-900/30 px-4 pt-2 gap-2 text-xs font-semibold">
          {[
            { id: 'link', label: 'Direct Share', icon: Share2 },
            { id: 'card', label: 'Social Card (OG)', icon: Sparkles },
            { id: 'qr', label: 'QR Code', icon: QrCode },
            { id: 'embed', label: 'Markdown Export', icon: FileCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all ${
                  isActive
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'link' && (
            <div className="space-y-4">
              {/* Copy URL bar */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Shareable Public URL
                </label>
                <div className="flex items-center gap-2 p-1.5 bg-zinc-900 rounded-xl border border-zinc-800">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full bg-transparent px-3 py-1 text-xs font-mono text-zinc-200 focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* One-click social intent triggers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    One-Click Share
                  </label>
                  {hasNativeShare && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Device Share Sheet</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <a
                    href={tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-100 transition-all hover:border-zinc-700 hover:scale-[1.02]"
                  >
                    <span className="text-zinc-100 font-bold">𝕏 / Twitter</span>
                  </a>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-emerald-400 transition-all hover:border-emerald-500/40 hover:scale-[1.02]"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={redditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-orange-400 transition-all hover:border-orange-500/40 hover:scale-[1.02]"
                  >
                    <span>Reddit</span>
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                <span className="font-bold">Zero-Friction Sharing:</span> Anyone with this link can view your list and upvote it directly without signing up!
              </div>
            </div>
          )}

          {activeTab === 'card' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                This rich 1200x630 social card is automatically rendered when your link is posted on Twitter/X, Discord, iMessage, and Slack.
              </p>
              <SocialCardPreview list={list} />
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
              <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl">
                <img
                  src={qrCodeUrl}
                  alt="QR Code for list"
                  className="w-48 h-48 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-200">Scan with phone camera</h4>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Instant mobile access to &quot;{list.title}&quot;
                </p>
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">
                  Formatted for Reddit posts, Discord messages, or MyAnimeList forum replies:
                </p>
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300"
                >
                  {copiedMarkdown ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied Markdown</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {`### [${list.title}](${shareUrl})\n*Category: ${list.category} | Curated by @${list.authorUsername}*\n\n${list.items
                  .map(
                    (it, idx) =>
                      `${idx + 1}. **${it.media.title.english || it.media.title.romaji}** (${it.media.format || it.media.mediaType}) - ${
                        it.score ? `${it.score}/100` : 'Unrated'
                      }\n   ${it.comment ? `> ${it.comment}` : ''}`
                  )
                  .join('\n\n')}`}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
